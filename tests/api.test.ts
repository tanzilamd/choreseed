import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.js";
import { Ledger } from "../src/ledger.js";
import { ProviderError, allowedUrl } from "../src/providers.js";
import { sampleRecipe } from "../src/shared/sample.js";
const headers = {
  origin: "http://localhost",
  "content-type": "application/json",
};
const payload = {
  headers: ["Name", "Email", "Customer ID"],
  instructions: "A synthetic test request",
  sources: [],
  clarification: "",
};
test("API accepts metadata only, rejects raw rows and cross-origin requests", async () => {
  const app = await createApp({
    ledger: new Ledger(":memory:"),
    configured: true,
    pricing: async () => 0.15,
    compiler: async () => ({
      result: { outcome: "ready", recipe: sampleRecipe },
      cost: 0.001,
    }),
  });
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/recipes/compile",
        headers,
        payload: { ...payload, rows: [["PRIVATE"]] },
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/recipes/compile",
        headers: { ...headers, origin: "https://evil.example" },
        payload,
      })
    ).statusCode,
    403,
  );
  const result = await app.inject({
    method: "POST",
    url: "/api/recipes/compile",
    headers,
    payload,
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.json().outcome, "ready");
  assert.match(result.headers["set-cookie"] as string, /HttpOnly/i);
  assert.equal(result.headers["cache-control"], "no-store");
  await app.close();
});
test("clarification/unsupported outcomes, quota exhaustion and provider timeout are distinct", async () => {
  let calls = 0;
  const l = new Ledger(":memory:");
  const app = await createApp({
    ledger: l,
    configured: true,
    pricing: async () => 0.15,
    compiler: async () => {
      calls++;
      if (calls === 1)
        return {
          result: {
            outcome: "needs_clarification",
            questions: ["Which key and keep rule?"],
          },
          cost: 0.001,
        };
      if (calls === 2)
        return {
          result: { outcome: "unsupported", reason: "No fuzzy matching." },
          cost: 0.001,
        };
      throw new ProviderError("Provider timeout.", "timeout");
    },
  });
  const one = await app.inject({
    method: "POST",
    url: "/api/recipes/compile",
    headers,
    payload,
  });
  assert.equal(one.json().outcome, "needs_clarification");
  const two = await app.inject({
    method: "POST",
    url: "/api/recipes/compile",
    headers,
    payload,
  });
  assert.equal(two.json().outcome, "unsupported");
  const three = await app.inject({
    method: "POST",
    url: "/api/recipes/compile",
    headers,
    payload,
  });
  assert.equal(three.statusCode, 502);
  assert.ok(Math.abs(l.status().aiAccountedUsd - 0.152) < 1e-8);
  const four = await app.inject({
    method: "POST",
    url: "/api/recipes/compile",
    headers,
    payload,
  });
  assert.equal(four.statusCode, 429);
  assert.equal(calls, 3);
  await app.close();
});
test("missing credentials serves honest paused state and health, no request dispatch", async () => {
  const app = await createApp({
    ledger: new Ledger(":memory:"),
    configured: false,
  });
  assert.equal((await app.inject("/healthz")).json().ok, true);
  assert.equal((await app.inject("/api/status")).json().liveConfigured, false);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/recipes/compile",
        headers,
        payload,
      })
    ).statusCode,
    503,
  );
  await app.close();
});
test("SSRF URL boundaries block private destinations, non-HTTPS and deceptive hosts", () => {
  for (const u of [
    "http://docs.python.org",
    "https://localhost",
    "https://127.0.0.1",
    "https://docs.python.org.evil.example",
    "https://u:p@docs.python.org",
    "https://docs.python.org:444",
    "file:///etc/passwd",
  ])
    assert.throws(() => allowedUrl(u));
  assert.equal(
    allowedUrl("https://docs.python.org/3/"),
    "https://docs.python.org/3/",
  );
});
