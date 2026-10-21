import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class GateError extends Error {
  constructor(
    message: string,
    public status = 429,
  ) {
    super(message);
  }
}
export class Ledger {
  db: DatabaseSync;
  constructor(
    path: string,
    public budget = 4,
    public browserLimit = 55,
    public now = () => Date.now(),
  ) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY, kind TEXT NOT NULL, session TEXT NOT NULL, ip TEXT NOT NULL,
      created INTEGER NOT NULL, state TEXT NOT NULL, reserved REAL NOT NULL, charged REAL NOT NULL);
      CREATE INDEX IF NOT EXISTS usage_keys ON attempts(kind,session,ip,created);
      CREATE TABLE IF NOT EXISTS flags(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
    // A lost worker does not imply a provider refund. Retain its full reservation.
    this.db.exec("UPDATE attempts SET state='uncertain' WHERE state='pending'");
  }
  reserve(
    kind: "compile" | "browser",
    session: string,
    ip: string,
    amount: number,
  ) {
    const now = this.now();
    const day = Math.floor(now / 86400000) * 86400000;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (
        kind === "compile" &&
        this.db.prepare("SELECT 1 FROM flags WHERE key='paused'").get()
      )
        throw new GateError(
          "Live AI is paused after an accounting anomaly. Saved routines and the fictional sample still work.",
        );
      if (
        this.db
          .prepare("SELECT 1 FROM attempts WHERE kind=? AND state='pending'")
          .get(kind)
      )
        throw new GateError(
          "One request is already running. Please try again after it finishes.",
        );
      const daily = (
        this.db
          .prepare(
            "SELECT COUNT(*) AS n FROM attempts WHERE kind=? AND session=? AND created>=?",
          )
          .get(kind, session, day) as { n: number }
      ).n;
      const hourly = (
        this.db
          .prepare(
            "SELECT COUNT(*) AS n FROM attempts WHERE kind=? AND ip=? AND created>?",
          )
          .get(kind, ip, now - 3600000) as { n: number }
      ).n;
      if (daily >= 3 || hourly >= 3)
        throw new GateError(
          "Live requests are paused for your session or network. Try later, use the fictional sample, or replay a saved routine.",
        );
      const used = (
        this.db
          .prepare(
            "SELECT COALESCE(SUM(charged),0) AS n FROM attempts WHERE kind=?",
          )
          .get(kind) as { n: number }
      ).n;
      const ceiling = kind === "compile" ? this.budget : this.browserLimit;
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        used + amount > ceiling + 1e-9
      )
        throw new GateError(
          "The demo allocation is exhausted. Saved routines and the fictional sample still work.",
        );
      const id = randomUUID();
      this.db
        .prepare("INSERT INTO attempts VALUES(?,?,?,?,?,'pending',?,?)")
        .run(id, kind, session, ip, now, amount, amount);
      this.db.exec("COMMIT");
      return id;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  finish(id: string, cost?: number) {
    const row = this.db
      .prepare("SELECT reserved FROM attempts WHERE id=?")
      .get(id) as { reserved: number } | undefined;
    if (!row) throw new Error("Unknown reservation.");
    if (
      cost !== undefined &&
      Number.isFinite(cost) &&
      cost >= 0 &&
      cost <= row.reserved + 1e-9
    ) {
      this.db
        .prepare("UPDATE attempts SET state='complete', charged=? WHERE id=?")
        .run(cost, id);
    } else {
      this.db
        .prepare("UPDATE attempts SET state='uncertain' WHERE id=?")
        .run(id);
      if (cost !== undefined)
        this.db
          .prepare(
            "INSERT OR REPLACE INTO flags VALUES('paused','cost exceeded reservation or was invalid')",
          )
          .run();
    }
  }
  status() {
    const used = (kind: string) =>
      (
        this.db
          .prepare(
            "SELECT COALESCE(SUM(charged),0) AS n FROM attempts WHERE kind=?",
          )
          .get(kind) as { n: number }
      ).n;
    return {
      aiAllocatedUsd: this.budget,
      aiAccountedUsd: used("compile"),
      browserAllocatedMinutes: this.browserLimit,
      browserAccountedMinutes: used("browser"),
      accountingPaused: Boolean(
        this.db.prepare("SELECT 1 FROM flags WHERE key='paused'").get(),
      ),
    };
  }
  close() {
    this.db.close();
  }
}
