# Delivery status

The free preview is usable at [choreseed.onrender.com](https://choreseed.onrender.com). The owner selected free hosting after paid Render provisioning continued to require payment information. Full public **live-AI** acceptance remains incomplete; live generation and public source reading are deliberately disabled until usage accounting has durable storage.

## Publicly verified free capabilities

- Fictional, hand-authored sample; ordered step editing; exact CSV download; explicit IndexedDB save; second compatible file with reordered columns; zero compile requests during replay.
- Both downloaded public CSV files matched independently written expected bytes. Values retained leading zeros and blank deduplication keys separately.
- Desktop/mobile layout and public offline reload/replay. The cache contains the document, stylesheet, application script, worker and icon; API responses are excluded. Live compile controls remain disabled in the paused state.
- Browserbase public sample → edit → save → second-file replay succeeded. Later public Browserbase checks also matched both export payloads and mobile layout. The initial public offline failure remains recorded; the corrected deployment's offline journey passed with local Chromium against the actual public origin.
- Public `/healthz` and `/api/status` return 200 with no-store headers. Same-origin compile returns an honest 503 while paused; cross-origin POST returns 403. Render restart returned 200 and subsequent public health/status checks succeeded. This availability check does **not** establish persistent live-AI quota storage.

The public check found a real build regression: formatting had separated the service worker's asset marker from the replacement pattern, leaving an empty precache. Commit `185d4ea74d95c1206f3582247cd44b94c3569af4` fixes injection, fails the build when the marker is absent, and strengthens browser cache assertions. Build/typecheck, all 22 deterministic/API/compiler/accounting tests, and all four local browser journeys passed after the fix. Public offline replay then passed on the new deployment. Earlier offline claims do not establish correctness of the intervening broken build; the failure and corrected public evidence are retained.

Current Render deployment: `dep-dbcgq7fb9u1s73beqpi0`, reported live at 2026-10-21T19:06:46.05004Z; source commit above. One free web service, Singapore, no disk, automatic deploys off. Free web services may sleep and share the workspace's monthly free-hour allocation; availability is not guaranteed.

## Access, storage and spending

The current cloud network now permits the deployment hostname; actual public HTTPS calls succeeded. Cloud configuration publication is no longer the blocker. Existing secure bindings were preserved. Chromium's certificate database was read-only inside the filesystem sandbox; the public browser check used the supported reviewed execution route with the existing writable trust store. TLS verification stayed enabled.

The dedicated `choreseed-runtime` environment group contains both owner-entered provider keys and a generated signing secret. Only key names/presence were inspected; values were not printed or copied from proxy placeholders. Presence does not replace a hosted live-provider verification. Render/DEV administration keys were not installed in the application.

The paid $7 service plus $0.25 disk request still returned HTTP 402 requiring payment information. No card or top-up was added. The owner then explicitly selected free hosting. Official Render documentation permits a free Postgres database, limited to one per workspace, 1 GB, and 30 days before expiry; free web services cannot attach persistent disks. The supported Postgres list and creation API routes returned Cloudflare HTTP 403 here. No database was created, and a Postgres ledger adapter has not been implemented. Do not enable live AI using the free service's ephemeral SQLite file or treat redeploy/restart as quota persistence.

Backboard balance read-back: $4.968007 paid credit, $5 free credit, auto-reload off. Development inference cost remains approximately $0.03004 ($0.00271257 initial probes, $0.01851218 evaluation, $0.00881150 recorded UI). No new inference was dispatched by these public preview checks. Browserbase usage is 12 minutes, including failed diagnostic sessions; all sessions were released. The remaining runtime allocation was reduced to 48 minutes, preserving the total 60-minute ceiling. The public AI allocation remains at most $4, disabled pending durable accounting.

## Other delivered evidence

Public MIT source on main; model/dependency attribution; setup, privacy, architecture, official challenge rules, independent tests, real-provider evaluation and an 85-second condensed recording from a roughly 120-second scripted fictional journey. Local real-provider source → clarification → compilation → save → second-file replay passed, with independently checked downloads and zero new inference on the second file. The selected open-weight model is Qwen3.5-35B-A3B, pinned through Backboard/OpenRouter to DeepInfra FP8. Initial failures and the targeted Bangla reference-ID correction remain documented. No human time-saving baseline, users, quotes or superiority claims were invented.

DEV draft `4891319` is updated in place with `published:false`; independent authenticated unpublished-list read-back verifies its publication state and exact body hash. An unpublished draft is not a submitted contest entry. No article publication or session export was performed.

## Remaining prerequisite for live AI

A supported free persistent database must first be made accessible to this deployment. Because the provider's database API is blocked here, creating that account-owned resource through Render Dashboard or resolving the API block requires owner/provider access. It must use the free plan with no card/top-up; its expiry must be tracked. Technical follow-up would then implement and verify durable database accounting, actual hosted model/source calls, and public quota exhaustion/restart persistence before enabling generation. Until then, the free preview's local-routine capabilities above are ready; the entire original live-AI scope is not.
