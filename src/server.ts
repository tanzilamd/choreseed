import Fastify from "fastify";
import cookie from "@fastify/cookie";
import serveStatic from "@fastify/static";
import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Ledger, GateError } from "./ledger.js";
import {
  CompileInput,
  HOSTS,
  MODEL,
  ProviderError,
  allowedUrl,
  compile,
  pricingReservation,
  readSources,
} from "./providers.js";
import { uniqueHeaders } from "./shared/recipe.js";

export async function createApp(
  options: {
    ledger?: Ledger;
    compiler?: typeof compile;
    reader?: typeof readSources;
    pricing?: typeof pricingReservation;
    configured?: boolean;
    secret?: string;
  } = {},
) {
  const production = process.env.NODE_ENV === "production";
  function developmentSecret() {
    if (production) return randomBytes(48).toString("hex"); // Live mode stays disabled without the production binding.
    mkdirSync(".local", { recursive: true });
    const path = ".local/session-signing-key";
    if (!existsSync(path)) {
      try {
        writeFileSync(path, randomBytes(48).toString("hex"), {
          mode: 0o600,
          flag: "wx",
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    }
    return readFileSync(path, "utf8");
  }
  const secret =
    options.secret || process.env.SESSION_SECRET || developmentSecret();
  const configured =
    options.configured ??
    Boolean(
      process.env.LIVE_AI_ENABLED !== "false" &&
        process.env.BACKBOARD_API_KEY &&
        process.env.BROWSERBASE_API_KEY &&
        (!production || process.env.SESSION_SECRET?.length! >= 32),
    );
  const ledger =
    options.ledger ||
    new Ledger(
      process.env.LEDGER_PATH || ".local/usage.sqlite",
      Math.min(Number(process.env.AI_BUDGET_USD || 4), 4),
      Math.min(Number(process.env.BROWSER_MINUTES || 50), 50),
    );
  const app = Fastify({
    logger: false,
    bodyLimit: 32 * 1024,
    trustProxy: production ? (_address, hop) => hop === 0 : false,
    requestTimeout: 120000,
  });
  await app.register(cookie);
  const sign = (v: string) =>
    createHmac("sha256", secret).update(v).digest("hex");
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "no-referrer")
      .header("X-Frame-Options", "DENY");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    if (req.url.startsWith("/api") || req.url === "/healthz")
      reply.header("Cache-Control", "no-store");
    if (req.method === "POST") {
      const expected =
        process.env.PUBLIC_ORIGIN ||
        process.env.RENDER_EXTERNAL_URL ||
        `${production ? "https" : "http"}://${req.headers.host}`;
      const devOrigin =
        !production &&
        ["http://localhost:5173", "http://127.0.0.1:5173"].includes(
          String(req.headers.origin),
        );
      let sameOrigin = false;
      try {
        sameOrigin =
          new URL(String(req.headers.origin)).origin ===
          new URL(expected).origin;
      } catch {
        /* Missing and opaque origins are rejected. */
      }
      if (!sameOrigin && !devOrigin)
        return reply.code(403).send({
          error: "Open Choreseed in its own tab and try again.",
          code: "origin",
        });
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return reply.code(415).send({
          error: "Use an application/json request.",
          code: "content_type",
        });
    }
  });
  function identity(req: any, reply: any) {
    let id: string | undefined;
    const raw = String(req.cookies.choreseed || "");
    const [candidate, signature] = raw.split(".");
    if (
      candidate &&
      /^[a-f0-9-]{36}$/.test(candidate) &&
      /^[a-f0-9]{64}$/.test(signature || "") &&
      timingSafeEqual(Buffer.from(sign(candidate)), Buffer.from(signature))
    )
      id = candidate;
    if (!id) {
      id = randomUUID();
      reply.setCookie("choreseed", `${id}.${sign(id)}`, {
        httpOnly: true,
        sameSite: "strict",
        secure: production,
        path: "/",
        maxAge: 30 * 86400,
      });
    }
    return { session: sign(`session:${id}`), ip: sign(`ip:${req.ip}`) };
  }
  app.get("/healthz", async () => ({ ok: true, app: "choreseed" }));
  app.get("/api/status", async () => ({
    liveConfigured: configured,
    livePauseReason: configured
      ? null
      : process.env.LIVE_AI_ENABLED === "false"
        ? "Live generation is paused until persistent hosting is available. The fictional sample and saved routines still work."
        : "Live AI is paused while server credentials are configured. The fictional sample and saved routines still work.",
    model: MODEL,
    supportedHosts: HOSTS,
    ...ledger.status(),
    limits: {
      sessionAttemptsPerDay: 3,
      ipAttemptsPerHour: 3,
      concurrentInference: 1,
    },
  }));
  app.post("/api/recipes/compile", async (req, reply) => {
    if (!configured)
      throw new ProviderError(
        process.env.LIVE_AI_ENABLED === "false"
          ? "Live AI is paused until persistent hosting is available. Use the fictional sample or a saved routine."
          : "Live AI is paused: service credentials are not configured. Use the fictional sample or a saved routine.",
        "not_configured",
      );
    const body = CompileInput.parse(req.body);
    uniqueHeaders(body.headers);
    for (const source of body.sources)
      if (source.kind === "url") {
        if (!source.url)
          throw new Error("URL references need their source URL.");
        allowedUrl(source.url);
      }
    const account = identity(req, reply);
    const reservation = await (options.pricing || pricingReservation)();
    const attempt = ledger.reserve(
      "compile",
      account.session,
      account.ip,
      reservation,
    );
    try {
      const { result, cost } = await (options.compiler || compile)(body);
      ledger.finish(attempt, cost);
      return result;
    } catch (error) {
      ledger.finish(attempt, (error as any)?.observedCost);
      throw error;
    }
  });
  app.post("/api/sources/read", async (req, reply) => {
    if (!configured)
      throw new ProviderError(
        process.env.LIVE_AI_ENABLED === "false"
          ? "Public browser reading is paused until persistent hosting is available. Paste relevant notes instead."
          : "Public browser reading is paused: service credentials are not configured. Paste relevant notes instead.",
        "not_configured",
      );
    const body = z
      .object({ urls: z.array(z.string().max(2000)).min(1).max(3) })
      .strict()
      .parse(req.body);
    body.urls.forEach(allowedUrl);
    const account = identity(req, reply);
    const attempt = ledger.reserve("browser", account.session, account.ip, 1);
    try {
      const sources = await (options.reader || readSources)(body.urls);
      ledger.finish(attempt, 1);
      return { sources };
    } catch (error) {
      ledger.finish(attempt);
      throw error;
    }
  });
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof GateError)
      return reply
        .code(error.status)
        .send({ error: error.message, code: "quota" });
    if (error instanceof ProviderError)
      return reply
        .code(error.code === "not_configured" ? 503 : 502)
        .send({ error: error.message, code: error.code });
    if (error instanceof z.ZodError)
      return reply.code(400).send({
        error:
          "Check the request fields and limits. Only column names, instructions, clarification and selected reference excerpts are accepted.",
        code: "validation",
      });
    const large = (error as { statusCode?: number }).statusCode === 413;
    return reply.code(large ? 413 : 400).send({
      error: large
        ? "This request is too large. Shorten instructions or excerpts."
        : "The request could not be processed. Check column names, source URLs and input format.",
      code: "request",
    });
  });
  const staticRoot = resolve("dist/web");
  if (existsSync(staticRoot)) {
    await app.register(serveStatic, {
      root: staticRoot,
      setHeaders: (response, path) => {
        if (path.endsWith("sw.js") || path.endsWith("index.html"))
          response.header("Cache-Control", "no-cache");
      },
    });
    // Fixed public recording routes; user input never selects a filesystem path.
    app.get("/demo.webm", (_req, reply) =>
      reply
        .type("video/webm")
        .sendFile("choreseed-demo.webm", resolve("docs/assets")),
    );
    app.get("/demo-poster.png", (_req, reply) =>
      reply.type("image/png").sendFile("start-desktop.png", resolve("docs/assets")),
    );
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith("/api/")
        ? reply.code(404).send({ error: "Unknown API route." })
        : reply.sendFile("index.html"),
    );
  }
  app.addHook("onClose", async () => {
    ledger.close();
  });
  return app;
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const app = await createApp();
  await app.listen({ port: Number(process.env.PORT || 3000), host: "0.0.0.0" });
  process.stdout.write(
    "Choreseed is listening. Request-content logging is disabled.\n",
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void app.close();
    });
}
