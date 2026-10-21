# Setup and production handoff

Node 24.19.0 is pinned in `.nvmrc` and package engines. Exact stable dependency versions and integrity hashes are locked. Use `npm ci`, `npm test`, `npm run build`, `npm start`. `npm run dev` starts both development servers. Use the existing isolated cloud checkout; do not create an extra worktree.

Required server configuration:

| Variable | Purpose |
| --- | --- |
| BACKBOARD_API_KEY | Backboard HTTPS API; never expose to browser bundles |
| BROWSERBASE_API_KEY | Browserbase session API and supported global CDP endpoint |
| BROWSERBASE_PROJECT_ID | Non-secret project selector; omitted API requests can infer the key's project |
| BACKBOARD_ASSISTANT_ID | Non-secret selector for the dedicated Choreseed compiler profile |
| SESSION_SECRET | Persistent random signing/HMAC secret, at least 32 characters |
| LEDGER_PATH | SQLite path on persistent disk, e.g. `/var/data/choreseed.sqlite` |
| PUBLIC_ORIGIN | Exact production origin; Render's `RENDER_EXTERNAL_URL` is supported automatically |
| AI_BUDGET_USD | At most 4, default 4 |
| BROWSER_MINUTES | At most 50, default 50 |
| NODE_ENV | `production` on Render |
| LIVE_AI_ENABLED | Set to `false` for the free preview; never enable on ephemeral storage |

Render/DEV administration credentials must never be installed in the app service or browser. A Codex proxy placeholder is not a raw runtime credential. A dedicated Render environment group, `choreseed-runtime`, has been created with a generated signing secret and non-secret project/Node configuration. The owner must securely enter the actual Backboard and Browserbase keys there. Do not copy them from proxy responses, scripts, screenshots or chat.

Target hosting is one 512 MB paid Node service ($7/month) and one 1 GB persistent disk ($0.25/month), one instance, no autoscaling. Estimated base compute/disk total: $7.25/month, excluding metered overages. The public app's limited workflow uses small payloads; do not enable unbounded traffic or increase plans. The owner reported $50 Render credit valid until October 1, 2027, and a Browserbase Developer reset on November 1, 2026; those account-specific statements are owner-provided, not public-API-verified balances. A reset date does not establish promotional expiry.

The paid creation request returned HTTP 402 requiring payment information. No new card or top-up is authorized. The currently deployed free service deliberately sets `LIVE_AI_ENABLED=false` and uses an ephemeral preview ledger; it is not the completed production configuration. See [delivery status](DELIVERY.md).

Final account observations: Backboard API reported $4.968007 paid credit and $5 free credit, auto-reload off. Synthetic model calls demonstrably deducted regular model-token credit; free/memory credit was not treated as interchangeable. Per-credit expiry is not exposed in the checked balance endpoint. Documentation says new-account free credit is valid for 30 days; that is not an independently verified expiry for every grant on this account. Browserbase usage API reported seven browser-minutes and zero proxy bytes after the development checks. The owner-provided Developer reset date does not establish the free promotional plan's end date.

Production build command: `npm ci --include=dev && npm run build`; startup: `npm start`; health check: `/healthz`. Mount the disk at `/var/data`; keep `LEDGER_PATH` there. Link only the dedicated Choreseed environment group. Do not modify other services, groups or account secrets. Verify `/api/status`, a real compilation, supported source reading, correct downloads and quota persistence after deployment. A Render deploy status alone is not a public functional test.

In the managed cloud machine, retain the inherited HTTPS proxy and CA trust. HTTP calls use an environment proxy dispatcher; Browserbase WSS uses `https-proxy-agent` through that same route. Direct Playwright WebSockets did not honor the proxy and failed DNS; the source reader uses proxy-compatible CDP. TLS verification remains enabled. Regional Browserbase hosts may be returned by session creation; the tested official global CDP endpoint is used deliberately, with no automatic region-host substitution.
