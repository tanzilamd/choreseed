import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  compatible,
  describe,
  validateRecipe,
  type Operation,
  type Recipe,
} from "../src/shared/recipe.js";
import { LIMITS, type Table } from "../src/shared/csv.js";
import type { Preview } from "../src/shared/engine.js";
import { sampleCsv, sampleRecipe } from "../src/shared/sample.js";
import {
  listRecipes,
  saveRecipe,
  deleteRecipe,
  download,
  type Saved,
} from "./local.js";
import "./style.css";

type DraftSource = {
  kind: "note" | "url";
  value: string;
  excerpt?: string;
  title?: string;
  truncated?: boolean;
};
function App() {
  const [screen, setScreen] = useState<
    "start" | "input" | "workbench" | "routines"
  >("start");
  const [table, setTable] = useState<Table>();
  const [recipe, setRecipe] = useState<Recipe>();
  const [file, setFile] = useState<File>();
  const [localText, setLocalText] = useState("");
  const [fileName, setFileName] = useState("");
  const [delimiter, setDelimiter] = useState<"" | "," | ";">("");
  const [instructions, setInstructions] = useState("");
  const [sources, setSources] = useState<DraftSource[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [consent, setConsent] = useState(false);
  const [safe, setSafe] = useState(true);
  const [changePage, setChangePage] = useState(0);
  const [excludedPage, setExcludedPage] = useState(0);
  const [previewState, setPreview] = useState<{
    result: Preview;
    table: Table;
    recipe: Recipe;
    safe: boolean;
  }>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [status, setStatus] = useState<any>();
  const [offline, setOffline] = useState(!navigator.onLine);
  const worker = useRef<Worker | null>(null);
  const sequence = useRef(0);
  const epoch = useRef(0);
  const aborter = useRef<AbortController | null>(null);
  const jobs = useRef(
    new Map<
      number,
      { resolve: (value: any) => void; reject: (error: Error) => void }
    >(),
  );
  const preview =
    previewState &&
    previewState.table === table &&
    previewState.recipe === recipe &&
    previewState.safe === safe
      ? previewState.result
      : undefined;
  const fictional = recipe?.model.provider === "none";
  async function refreshSaved() {
    try {
      setSaved(await listRecipes());
    } catch {
      setError(
        "Local storage is unavailable. Download recipe JSON to keep your routine.",
      );
    }
  }
  useEffect(() => {
    worker.current = new Worker(new URL("./csv.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current.onmessage = (event) => {
      const job = jobs.current.get(event.data.id);
      if (!job) return;
      jobs.current.delete(event.data.id);
      event.data.error
        ? job.reject(new Error(event.data.error))
        : job.resolve(event.data.result);
    };
    void refreshSaved();
    void fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
    const connected = () => setOffline(!navigator.onLine);
    window.addEventListener("online", connected);
    window.addEventListener("offline", connected);
    if ("serviceWorker" in navigator && import.meta.env.PROD)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      worker.current?.terminate();
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", connected);
    };
  }, []);
  function compute(data: unknown): Promise<any> {
    const id = ++sequence.current;
    return new Promise((resolve, reject) => {
      jobs.current.set(id, { resolve, reject });
      worker.current!.postMessage({ id, ...(data as any) });
    });
  }
  function invalidate() {
    epoch.current++;
    aborter.current?.abort();
    setBusy("");
    setQuestions([]);
    setAnswer("");
    setError("");
  }
  useEffect(() => {
    if (!table || !recipe) return;
    let current = true;
    setPreview(undefined);
    setChangePage(0);
    setExcludedPage(0);
    void compute({ table, recipe, safe })
      .then((result) => {
        if (current) {
          setPreview({ result, table, recipe, safe });
          setError("");
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [table, recipe, safe]);
  async function readFile(
    nextFile?: File,
    text = "",
    chosenDelimiter = delimiter,
  ) {
    invalidate();
    setTable(undefined);
    setPreview(undefined);
    setBusy("Reading CSV locally…");
    const current = epoch.current;
    try {
      if (nextFile && nextFile.size > LIMITS.bytes)
        throw new Error("This file exceeds 2 MB. Choose a smaller CSV.");
      const parsed = await compute({
        file: nextFile,
        text,
        delimiter: chosenDelimiter || undefined,
      });
      if (current !== epoch.current) return;
      setTable(parsed);
      setFile(nextFile);
      setLocalText(text);
      setFileName(nextFile?.name || "fictional-contacts.csv");
      if (recipe && !compatible(recipe.requiredHeaders, parsed.headers))
        setError(
          "Schema mismatch. The saved routine requires the same unique header set. Choose a compatible file.",
        );
    } catch (e) {
      if (current === epoch.current) setError((e as Error).message);
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  function reset() {
    invalidate();
    setTable(undefined);
    setRecipe(undefined);
    setFile(undefined);
    setLocalText("");
    setFileName("");
    setSources([]);
    setInstructions("");
    setNotice("");
    setPreview(undefined);
    setScreen("input");
  }
  async function sample() {
    reset();
    setRecipe(sampleRecipe);
    setScreen("workbench");
    await readFile(undefined, sampleCsv);
  }
  async function api(path: string, body: unknown) {
    const controller = new AbortController();
    aborter.current = controller;
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error || "The service could not complete this request.",
      );
    return data;
  }
  async function fetchReferences() {
    const current = ++epoch.current;
    setError("");
    setBusy("Opening a public browser and reading sources…");
    try {
      const urls = sources.filter((s) => s.kind === "url").map((s) => s.value);
      const data = await api("/api/sources/read", { urls });
      if (current !== epoch.current) return;
      let index = 0;
      setSources(
        sources.map((s) => {
          if (s.kind !== "url") return s;
          const fetched = data.sources[index++];
          return {
            ...s,
            excerpt: fetched.text,
            title: fetched.label,
            truncated: fetched.truncated,
          };
        }),
      );
      setNotice(
        "References read. Review and edit the selected excerpts before compiling.",
      );
    } catch (e) {
      if (current === epoch.current)
        setError(
          (e as Error).message + " You can switch a source to pasted notes.",
        );
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  async function compileRoutine() {
    if (!table || !consent) return;
    const current = ++epoch.current;
    setBusy("Compiling instructions with the open-weight model…");
    setError("");
    try {
      const selected = sources.map((s, i) => {
        if (s.kind === "url" && !s.excerpt)
          throw new Error("Read each URL first, or switch it to pasted notes.");
        const raw = s.kind === "url" ? s.excerpt! : s.value;
        if (!raw.trim())
          throw new Error("Remove empty references or add notes.");
        return {
          id: `source-${i + 1}`,
          kind: s.kind,
          label: s.title || `Pasted notes ${i + 1}`,
          ...(s.kind === "url" ? { url: s.value } : {}),
          text: raw.slice(0, 4000),
          truncated: Boolean(s.truncated || raw.length > 4000),
        };
      });
      const data = await api("/api/recipes/compile", {
        headers: table.headers,
        instructions,
        clarification: answer,
        sources: selected,
      });
      if (current !== epoch.current) return;
      if (data.outcome === "needs_clarification") {
        setQuestions(data.questions);
        setNotice("One missing decision before the rehearsal.");
      } else if (data.outcome === "unsupported") {
        setError(data.reason);
      } else {
        setRecipe(validateRecipe(data.recipe));
        setScreen("workbench");
        setQuestions([]);
        setNotice(
          "Preview-ready. Review every step, changed cell and excluded row before accepting.",
        );
      }
    } catch (e) {
      if (current === epoch.current) setError((e as Error).message);
    } finally {
      if (current === epoch.current) setBusy("");
    }
  }
  function cancel() {
    invalidate();
    setNotice(
      "Cancelled in this tab. A paid request may still finish and remains accounted for.",
    );
  }
  function updateStep(index: number, operation: Operation) {
    if (!recipe) return;
    setRecipe({
      ...recipe,
      operations: recipe.operations.map((s, i) =>
        i === index ? operation : s,
      ),
    });
  }
  function changeType(index: number, type: Operation["type"]) {
    if (!recipe) return;
    const previous = recipe.operations[index];
    const references = previous.references;
    const column =
      "column" in previous
        ? previous.column
        : previous.type === "deduplicate"
          ? previous.key[0]
          : table?.headers[0] || recipe.requiredHeaders[0];
    const step: Operation =
      type === "remove_empty_rows"
        ? { type, references }
        : type === "deduplicate"
          ? { type, references, key: [column], keep: "first" }
          : type === "rename"
            ? { type, references, column, to: "" }
            : { type, references, column };
    updateStep(index, step);
  }
  async function importRoutine(imported?: File) {
    if (!imported) return;
    try {
      if (imported.size > 100000)
        throw new Error("Recipe JSON must be smaller than 100 KB.");
      const next = validateRecipe(JSON.parse(await imported.text()));
      await saveRecipe(next);
      await refreshSaved();
      setNotice(
        "Recipe imported to this browser. Raw CSV files are never saved.",
      );
    } catch (e) {
      setError("Recipe import rejected: " + (e as Error).message);
    }
  }
  const columns = [
    ...new Set([
      ...(table?.headers || recipe?.requiredHeaders || []),
      ...(recipe?.operations
        .filter((s) => s.type === "rename")
        .map((s) => s.to) || []),
    ]),
  ];
  return (
    <div className="app">
      <header className="site-header">
        <button
          className="wordmark"
          onClick={() => setScreen("start")}
          aria-label="Choreseed home"
        >
          <img src="/icon.svg" alt="" />
          choreseed<span className="beta">EARLY SEED</span>
        </button>
        <nav aria-label="Main">
          <button
            className={screen === "routines" ? "active" : ""}
            onClick={() => {
              setScreen("routines");
              void refreshSaved();
            }}
          >
            My routines <span>{saved.length}</span>
          </button>
          <a
            href="https://github.com/tanzilamd/choreseed"
            target="_blank"
            rel="noreferrer"
          >
            Source →
          </a>
        </nav>
      </header>
      <main>
        {status && !status.liveConfigured && !offline && (
          <div className="banner" role="status">
            {status.livePauseReason}
          </div>
        )}
        {offline && (
          <div className="banner">
            You’re offline. Saved routines work locally; live AI and source
            reading need a connection.
          </div>
        )}
        {error && (
          <div className="message error" role="alert">
            <strong>A small snag.</strong> {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        {notice && (
          <div className="message" role="status">
            {notice}
          </div>
        )}
        {screen === "start" && (
          <>
            <div className="hero">
              <div>
                <p className="eyebrow">SMALL ROUTINES. LESS REPEATING.</p>
                <h1>
                  What would you like
                  <br />
                  to stop doing
                  <br />
                  <em>by hand?</em>
                </h1>
                <p className="intro">
                  Turn a contact CSV chore into a little routine.
                  <br />
                  Rehearse it once. Keep it for the next file.
                </p>
                <div className="hero-actions">
                  <button className="primary" onClick={reset}>
                    Create a routine <span>→</span>
                  </button>
                  <button className="secondary" onClick={() => void sample()}>
                    Try a fictional sample →
                  </button>
                </div>
                <p className="quiet">
                  No signup. Your CSV stays in this browser.
                </p>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="seed-card">
                  <span className="tiny">CONTACT CLEANUP / RECIPE 01</span>
                  <div className="seed-drawing">⌁</div>
                  <span>
                    trim the edges
                    <br />
                    keep what matters
                    <br />
                    <strong>run it again ↻</strong>
                  </span>
                </div>
                <span className="art-note">
                  a little less
                  <br />
                  every time.
                </span>
              </div>
            </div>
            <section className="how" aria-label="How Choreseed works">
              <div>
                <span>01 / EXPLAIN</span>
                <h2>Bring the chore.</h2>
                <p>
                  Add a CSV, your instructions, and any useful notes or public
                  references. English or Bangla instructions.
                </p>
              </div>
              <div>
                <span>02 / REHEARSE</span>
                <h2>See every change.</h2>
                <p>
                  An open-weight model proposes small, editable steps. You
                  resolve missing decisions and review the output.
                </p>
              </div>
              <div>
                <span>03 / REPEAT</span>
                <h2>Let the routine do it.</h2>
                <p>
                  Save locally. Run it on the next compatible file, without a
                  new prompt or AI call.
                </p>
              </div>
            </section>
          </>
        )}
        {screen === "input" && (
          <>
            <p className="eyebrow">
              {recipe
                ? "REUSE / NO INFERENCE NEEDED"
                : "01 / PLANT A SMALL ROUTINE"}
            </p>
            <h1 className="page-title">
              {recipe
                ? "Next file. Same little routine."
                : "Bring the messy list."}
            </h1>
            <p className="intro">
              {recipe
                ? `Using “${recipe.title}”. Header order may change; the unique header set must match.`
                : "Contact CSV cleanup, with a plan you can inspect."}
            </p>
            <div className="input-grid">
              <section className="panel">
                <h2>
                  <span className="number">1</span>Your CSV
                </h2>
                <label className="file-drop">
                  {fileName ? (
                    <>
                      <strong>{fileName}</strong>
                      <span>Choose another file</span>
                    </>
                  ) : (
                    <>
                      <strong>Choose a local CSV</strong>
                      <span>UTF-8 · up to 2 MB · 10,000 rows · 50 columns</span>
                    </>
                  )}
                  <input
                    aria-label="Upload contact CSV"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) void readFile(e.target.files[0]);
                    }}
                  />
                </label>
                <label className="inline-field">
                  Delimiter
                  <select
                    value={delimiter}
                    onChange={(e) => {
                      const value = e.target.value as typeof delimiter;
                      setDelimiter(value);
                      if (file || localText)
                        void readFile(file, localText, value);
                    }}
                  >
                    <option value="">Detect comma / semicolon</option>
                    <option value=",">Comma</option>
                    <option value=";">Semicolon</option>
                  </select>
                </label>
                {table && (
                  <>
                    <p className="quiet">
                      {table.rows.length} rows · {table.headers.length} columns
                      · values kept as text
                    </p>
                    <DataTable
                      headers={table.headers}
                      rows={table.rows.slice(0, 5)}
                    />
                    <p className="quiet">
                      First 5 rows shown. The original file stays untouched.
                    </p>
                  </>
                )}
              </section>
              {!recipe ? (
                <section className="panel">
                  <h2>
                    <span className="number">2</span>What should happen?
                  </h2>
                  <label>
                    Instructions
                    <textarea
                      aria-label="Instructions"
                      rows={5}
                      maxLength={4000}
                      value={instructions}
                      placeholder="Trim Name and Email. Lowercase Email. Remove empty rows. Deduplicate by Email, keeping the first row."
                      onChange={(e) => {
                        invalidate();
                        setInstructions(e.target.value);
                      }}
                    />
                  </label>
                  <p className="quiet">
                    Supported: trim, explicit letter case, rename, deduplicate,
                    remove completely empty rows. Blank dedupe keys always stay
                    separate.
                  </p>
                  <details className="references">
                    <summary>
                      Optional references & notes{" "}
                      <span>{sources.length}/3</span>
                    </summary>
                    <p>
                      Public hosts: Python docs, MDN, Microsoft Support, Google
                      Support, freeCodeCamp. For videos, paste permitted
                      transcript excerpts or your notes.
                    </p>
                    {sources.map((s, i) => (
                      <div className="source" key={i}>
                        <label>
                          Source {i + 1}
                          <select
                            value={s.kind}
                            onChange={(e) => {
                              invalidate();
                              setSources(
                                sources.map((v, j) =>
                                  i === j
                                    ? {
                                        kind: e.target.value as "note" | "url",
                                        value: "",
                                      }
                                    : v,
                                ),
                              );
                            }}
                          >
                            <option value="note">Pasted notes</option>
                            <option value="url">Public URL</option>
                          </select>
                        </label>
                        <label>
                          {s.kind === "url" ? "HTTPS URL" : "Relevant notes"}
                          <textarea
                            rows={s.kind === "url" ? 2 : 4}
                            value={s.value}
                            onChange={(e) => {
                              invalidate();
                              setSources(
                                sources.map((v, j) =>
                                  i === j
                                    ? {
                                        ...v,
                                        value: e.target.value,
                                        excerpt: undefined,
                                      }
                                    : v,
                                ),
                              );
                            }}
                          />
                        </label>
                        {s.excerpt !== undefined && (
                          <label>
                            Selected excerpt sent to AI
                            <textarea
                              rows={4}
                              maxLength={4000}
                              value={s.excerpt}
                              onChange={(e) => {
                                invalidate();
                                setSources(
                                  sources.map((v, j) =>
                                    i === j
                                      ? { ...v, excerpt: e.target.value }
                                      : v,
                                  ),
                                );
                              }}
                            />
                          </label>
                        )}
                        {(s.truncated || s.value.length > 4000) && (
                          <p className="warning">
                            Truncated: at most 4,000 characters from this source
                            go to AI.
                          </p>
                        )}
                        <button
                          className="text-button"
                          onClick={() => {
                            invalidate();
                            setSources(sources.filter((_, j) => j !== i));
                          }}
                        >
                          Remove source {i + 1}
                        </button>
                      </div>
                    ))}
                    <div className="button-row">
                      {sources.length < 3 && (
                        <button
                          className="secondary"
                          onClick={() => {
                            invalidate();
                            setSources([
                              ...sources,
                              { kind: "note", value: "" },
                            ]);
                          }}
                        >
                          + Add reference
                        </button>
                      )}
                      {sources.some((s) => s.kind === "url") && (
                        <button
                          className="secondary"
                          disabled={Boolean(busy) || !consent || offline}
                          onClick={() => void fetchReferences()}
                        >
                          Read public URLs
                        </button>
                      )}
                    </div>
                  </details>
                  <label className="check privacy">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      I understand: column names, instructions, clarification,
                      and selected reference excerpts go to the hosted AI. CSV
                      rows stay in this browser. Don’t include sensitive data in
                      notes. Provider retention policies apply.
                    </span>
                  </label>
                  {questions.length > 0 && (
                    <section className="clarify" aria-label="Clarification">
                      <h3>One missing decision</h3>
                      <ul>
                        {questions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                      <label>
                        Your answer
                        <textarea
                          value={answer}
                          rows={3}
                          maxLength={2000}
                          onChange={(e) => {
                            epoch.current++;
                            aborter.current?.abort();
                            setBusy("");
                            setAnswer(e.target.value);
                          }}
                        />
                      </label>
                    </section>
                  )}
                  <button
                    className="primary wide"
                    disabled={
                      !table ||
                      !instructions.trim() ||
                      !consent ||
                      Boolean(busy) ||
                      offline ||
                      (questions.length > 0 && !answer.trim())
                    }
                    onClick={() => void compileRoutine()}
                  >
                    {questions.length
                      ? "Answer & compile"
                      : "Create my routine"}{" "}
                    →
                  </button>
                  <p className="quiet">
                    Up to 3 compile attempts per session/day and per IP/hour.
                    Failed paid attempts count. One inference at a time.
                  </p>
                  {status && !status.liveConfigured && (
                    <p className="warning">
                      {status.livePauseReason ||
                        "Live AI is paused while service credentials are configured."}
                    </p>
                  )}
                </section>
              ) : (
                <section className="panel replay">
                  <span className="loop" aria-hidden="true">
                    ↻
                  </span>
                  <h2>{recipe.title}</h2>
                  <p>
                    This replay uses the saved steps, locally. No new prompt,
                    source reading, or inference.
                  </p>
                  <ol>
                    {recipe.operations.map((s, i) => (
                      <li key={i}>{describe(s)}</li>
                    ))}
                  </ol>
                  <button
                    className="primary"
                    disabled={!table || !preview}
                    onClick={() => setScreen("workbench")}
                  >
                    Rehearse this file →
                  </button>
                </section>
              )}
            </div>
          </>
        )}
        {screen === "workbench" && recipe && (
          <>
            <div className="workbench-heading">
              <div>
                <p className="eyebrow">02 / REHEARSE BEFORE YOU KEEP</p>
                <h1 className="page-title">{recipe.title}</h1>
                <p>
                  {fictional
                    ? "Fictional, hand-authored sample. No AI call."
                    : `Compiled with ${recipe.model.id} · ${recipe.model.upstream}`}
                </p>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  setScreen("input");
                  setNotice(
                    "Choose another compatible CSV. The routine will replay without inference.",
                  );
                }}
              >
                Use another file ↻
              </button>
            </div>
            <div className="workbench">
              <aside className="panel steps">
                <div className="section-heading">
                  <h2>The routine</h2>
                  <span className="pill">{recipe.operations.length} steps</span>
                </div>
                <p className="quiet">
                  Edit or reorder. The local rehearsal reruns after every
                  change.
                </p>
                {recipe.operations.map((s, i) => (
                  <div className="step" key={i}>
                    <div className="step-top">
                      <span>STEP {String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <button
                          disabled={i === 0}
                          aria-label={`Move step ${i + 1} up`}
                          onClick={() => {
                            const ops = [...recipe.operations];
                            [ops[i - 1], ops[i]] = [ops[i], ops[i - 1]];
                            setRecipe({ ...recipe, operations: ops });
                          }}
                        >
                          ↑
                        </button>
                        <button
                          disabled={i === recipe.operations.length - 1}
                          aria-label={`Move step ${i + 1} down`}
                          onClick={() => {
                            const ops = [...recipe.operations];
                            [ops[i + 1], ops[i]] = [ops[i], ops[i + 1]];
                            setRecipe({ ...recipe, operations: ops });
                          }}
                        >
                          ↓
                        </button>
                        <button
                          aria-label={`Delete step ${i + 1}`}
                          onClick={() =>
                            setRecipe({
                              ...recipe,
                              operations: recipe.operations.filter(
                                (_, j) => i !== j,
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <label className="sr-only" htmlFor={`type-${i}`}>
                      Step {i + 1} operation
                    </label>
                    <select
                      id={`type-${i}`}
                      value={s.type}
                      onChange={(e) =>
                        changeType(i, e.target.value as Operation["type"])
                      }
                    >
                      <option value="trim">Trim whitespace</option>
                      <option value="lowercase">Lowercase</option>
                      <option value="uppercase">Uppercase</option>
                      <option value="rename">Rename column</option>
                      <option value="deduplicate">Deduplicate rows</option>
                      <option value="remove_empty_rows">
                        Remove empty rows
                      </option>
                    </select>
                    {"column" in s && (
                      <label>
                        Column
                        <select
                          value={s.column}
                          onChange={(e) =>
                            updateStep(i, { ...s, column: e.target.value })
                          }
                        >
                          {columns.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {s.type === "rename" && (
                      <label>
                        New name
                        <input
                          value={s.to}
                          maxLength={128}
                          onChange={(e) =>
                            updateStep(i, { ...s, to: e.target.value })
                          }
                        />
                      </label>
                    )}
                    {s.type === "deduplicate" && (
                      <>
                        <fieldset>
                          <legend>Key columns</legend>
                          {columns.map((c) => (
                            <label className="check" key={c}>
                              <input
                                type="checkbox"
                                checked={s.key.includes(c)}
                                onChange={(e) =>
                                  updateStep(i, {
                                    ...s,
                                    key: e.target.checked
                                      ? [...s.key, c]
                                      : s.key.filter((k) => k !== c),
                                  })
                                }
                              />
                              {c}
                            </label>
                          ))}
                        </fieldset>
                        <label>
                          Keep
                          <select
                            value={s.keep}
                            onChange={(e) =>
                              updateStep(i, {
                                ...s,
                                keep: e.target.value as "first" | "last",
                              })
                            }
                          >
                            <option value="first">First occurrence</option>
                            <option value="last">Last occurrence</option>
                          </select>
                        </label>
                        <p className="quiet">
                          Blank keys are kept separately. Retained rows stay in
                          original order.
                        </p>
                      </>
                    )}
                    <small>
                      References:{" "}
                      {s.references
                        .map(
                          (r) =>
                            recipe.sources.find((source) => source.id === r)
                              ?.label || r,
                        )
                        .join(" · ")}
                    </small>
                  </div>
                ))}
                <button
                  className="secondary wide"
                  onClick={() =>
                    setRecipe({
                      ...recipe,
                      operations: [
                        ...recipe.operations,
                        {
                          type: "trim",
                          column: recipe.requiredHeaders[0],
                          references: ["instruction"],
                        },
                      ],
                    })
                  }
                >
                  + Add step
                </button>
                <details>
                  <summary>Assumptions & references</summary>
                  <ul>
                    {recipe.assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  <p className="quiet">
                    References point to inputs; their existence does not prove
                    that they support a step. Review the actual guidance.
                  </p>
                  {recipe.sources.map((s) => (
                    <p key={s.id}>
                      <strong>{s.id}</strong>: {s.label}{" "}
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noreferrer">
                          Open →
                        </a>
                      )}
                    </p>
                  ))}
                </details>
              </aside>
              <section className="preview-area">
                <div className="preview-summary">
                  <div>
                    <span className="eyebrow">THE REHEARSAL</span>
                    <h2>Small changes. In plain sight.</h2>
                  </div>
                  {preview && (
                    <div className="counts">
                      <span>
                        <strong>{preview.changes.length}</strong>changed cells
                      </span>
                      <span>
                        <strong>{preview.excluded.length}</strong>excluded rows
                      </span>
                      <span>
                        <strong>{preview.rows.length}</strong>output rows
                      </span>
                    </div>
                  )}
                </div>
                <label className="check safety">
                  <input
                    type="checkbox"
                    checked={safe}
                    onChange={(e) => setSafe(e.target.checked)}
                  />
                  <span>
                    Spreadsheet-safe export{" "}
                    <strong>{safe ? "on" : "off"}</strong> · formula-like values
                    are prefixed with an apostrophe, visible below.
                  </span>
                </label>
                {!safe && (
                  <p className="warning">
                    Formula-like cells may execute when opened in spreadsheet
                    software. Turn safe export on unless you need exact
                    unescaped text.
                  </p>
                )}
                {preview && table ? (
                  <>
                    <div className="before-after">
                      <div className="panel">
                        <h3>
                          Before <span>first 8 input rows</span>
                        </h3>
                        <DataTable
                          headers={table.headers}
                          rows={table.rows.slice(0, 8)}
                        />
                      </div>
                      <div className="panel after">
                        <h3>
                          After <span>first 8 output rows</span>
                        </h3>
                        <DataTable
                          headers={preview.headers}
                          rows={preview.rows.slice(0, 8)}
                        />
                      </div>
                    </div>
                    <details className="panel audit" open>
                      <summary>
                        Changed cells · {preview.changes.length}
                      </summary>
                      {preview.changes.length ? (
                        <div
                          className="audit-scroll"
                          tabIndex={0}
                          aria-label="Scrollable changed cells"
                        >
                          <table>
                            <thead>
                              <tr>
                                <th>CSV row</th>
                                <th>Column</th>
                                <th>Before</th>
                                <th>After</th>
                                <th>Why</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.changes
                                .slice(changePage * 100, (changePage + 1) * 100)
                                .map((c, i) => (
                                  <tr key={i}>
                                    <td>{c.row}</td>
                                    <th>{c.column}</th>
                                    <td>
                                      <code>{c.before || "∅"}</code>
                                    </td>
                                    <td className="changed">
                                      <code>{c.after || "∅"}</code>
                                    </td>
                                    <td>{c.reason}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p>No cell values changed.</p>
                      )}
                      {preview.changes.length > 100 && (
                        <div className="button-row">
                          <button
                            className="secondary"
                            disabled={changePage === 0}
                            onClick={() => setChangePage(changePage - 1)}
                          >
                            Previous changes
                          </button>
                          <span>
                            Page {changePage + 1} of{" "}
                            {Math.ceil(preview.changes.length / 100)}
                          </span>
                          <button
                            className="secondary"
                            disabled={
                              (changePage + 1) * 100 >= preview.changes.length
                            }
                            onClick={() => setChangePage(changePage + 1)}
                          >
                            Next changes
                          </button>
                        </div>
                      )}
                      {preview.escapedHeaders.length > 0 && (
                        <p>
                          Spreadsheet-safe header escaping:{" "}
                          {preview.escapedHeaders.join(", ")}. The After header
                          shows the exported text.
                        </p>
                      )}
                    </details>
                    <details className="panel audit">
                      <summary>
                        Excluded rows · {preview.excluded.length}
                      </summary>
                      <p>
                        CSV row numbers include the header row. Excluded records
                        remain in your original file.
                      </p>
                      <ul tabIndex={0} aria-label="Scrollable excluded rows">
                        {preview.excluded
                          .slice(excludedPage * 100, (excludedPage + 1) * 100)
                          .map((r) => (
                            <li key={r.row}>
                              Row {r.row}: {r.reason}
                            </li>
                          ))}
                      </ul>
                      {preview.excluded.length > 100 && (
                        <div className="button-row">
                          <button
                            className="secondary"
                            disabled={excludedPage === 0}
                            onClick={() => setExcludedPage(excludedPage - 1)}
                          >
                            Previous exclusions
                          </button>
                          <span>
                            Page {excludedPage + 1} of{" "}
                            {Math.ceil(preview.excluded.length / 100)}
                          </span>
                          <button
                            className="secondary"
                            disabled={
                              (excludedPage + 1) * 100 >=
                              preview.excluded.length
                            }
                            onClick={() => setExcludedPage(excludedPage + 1)}
                          >
                            Next exclusions
                          </button>
                        </div>
                      )}
                    </details>
                    <section className="save-bar">
                      <div>
                        <h2>Happy with the rehearsal?</h2>
                        <p>
                          Accept this output. Keep the routine for next time.
                        </p>
                      </div>
                      <div className="button-row">
                        <button
                          className="primary"
                          onClick={() =>
                            download(
                              preview.csv,
                              fileName.replace(/\.csv$/i, "") + "-cleaned.csv",
                              "text/csv;charset=utf-8",
                            )
                          }
                        >
                          Accept & download CSV ↓
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            download(
                              JSON.stringify(recipe, null, 2),
                              "choreseed-recipe.json",
                              "application/json",
                            )
                          }
                        >
                          Export recipe JSON
                        </button>
                        <button
                          className="secondary"
                          onClick={() => {
                            void saveRecipe(recipe)
                              .then(refreshSaved)
                              .then(() =>
                                setNotice(
                                  "Routine saved to this browser. Your CSV was not saved.",
                                ),
                              )
                              .catch(() =>
                                setError(
                                  "Could not save locally. Export recipe JSON instead.",
                                ),
                              );
                          }}
                        >
                          Save routine to this browser
                        </button>
                      </div>
                    </section>
                  </>
                ) : (
                  <div className="panel">
                    <p>
                      {error
                        ? "Resolve the routine or file issue above to preview and export."
                        : "Rehearsing locally…"}
                    </p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
        {screen === "routines" && (
          <>
            <div className="workbench-heading">
              <div>
                <p className="eyebrow">03 / KEEP THE USEFUL BITS</p>
                <h1 className="page-title">My routines</h1>
                <p>Saved in this browser. CSV files are never stored.</p>
              </div>
              <label className="import-button secondary">
                Import recipe JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  aria-label="Import recipe JSON"
                  onChange={(e) => void importRoutine(e.target.files?.[0])}
                />
              </label>
            </div>
            {!saved.length ? (
              <section className="empty panel">
                <span className="loop" aria-hidden="true">
                  ↻
                </span>
                <h2>A small routine starts here.</h2>
                <p>Save a reviewed routine, or import its portable JSON.</p>
                <button className="primary" onClick={reset}>
                  Create a routine →
                </button>
              </section>
            ) : (
              <div className="routine-grid">
                {saved.map((item) => (
                  <article className="panel routine-card" key={item.id}>
                    <span className="eyebrow">
                      {item.recipe.model.provider === "none"
                        ? "FICTIONAL SAMPLE ROUTINE"
                        : "REUSABLE LOCAL ROUTINE"}
                    </span>
                    <h2>{item.recipe.title}</h2>
                    <p>
                      {item.recipe.operations.length} steps ·{" "}
                      {item.recipe.requiredHeaders.join(", ")}
                    </p>
                    <p className="quiet">
                      Saved {new Date(item.savedAt).toLocaleDateString()} · no
                      new AI call to replay
                    </p>
                    <button
                      className="primary"
                      onClick={() => {
                        invalidate();
                        setTable(undefined);
                        setFile(undefined);
                        setLocalText("");
                        setFileName("");
                        setRecipe(item.recipe);
                        setNotice(
                          "Choose the next compatible CSV. Replay stays in your browser.",
                        );
                        setScreen("input");
                      }}
                    >
                      Use routine ↻
                    </button>
                    <div className="button-row">
                      <button
                        className="text-button"
                        onClick={() =>
                          download(
                            JSON.stringify(item.recipe, null, 2),
                            "choreseed-recipe.json",
                            "application/json",
                          )
                        }
                      >
                        Export JSON ↓
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          void deleteRecipe(item.id)
                            .then(refreshSaved)
                            .then(() =>
                              setNotice("Routine deleted from this browser."),
                            );
                        }}
                      >
                        Delete routine
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
        {busy && (
          <div className="progress" role="status">
            <span className="spinner" />
            {busy}
            <button className="text-button" onClick={cancel}>
              Cancel in this tab
            </button>
          </div>
        )}
      </main>
      <footer>
        <div>
          <img src="/icon.svg" alt="" />
          <strong>choreseed</strong>
          <span>A little less by hand.</span>
        </div>
        <p>Local CSV execution · Open-weight compilation · Portable routines</p>
        <details>
          <summary>Privacy & limits</summary>
          <p>
            Raw CSV rows are processed in a Web Worker and remain in memory.
            Explicitly saved recipes use IndexedDB. Instructions, headers and
            selected excerpts are sent to Backboard/OpenRouter; URL reading uses
            Browserbase. Provider retention policies apply. The server persists
            hashed quota identifiers and usage amounts, not request content.
            Download a new file; your original is untouched. Offline replay
            requires the static app to have been cached. AI creation needs an
            internet connection and remaining quota. Source citation accuracy
            and every proposed change need your review.
          </p>
        </details>
      </footer>
    </div>
  );
}
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      aria-label="Scrollable CSV preview"
    >
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>
                  {cell === "" ? (
                    <span className="blank">empty</span>
                  ) : (
                    <span className="cell">{cell}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>No data rows.</p>}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
