# Verification

`npm test` runs independent, hand-authored fixtures and mocked backend tests. It does not spend credits. It covers whitespace/Unicode/Bangla values, quoted commas/newlines, BOM/semicolons, leading zeros, incomplete compound dedupe keys, keep first/last and order, empty rows, renames/collisions, malformed/header/size errors, formula escaping, exact CSV round-trip, import validation, schema drift, invalid model JSON/steps/columns/citations, same-origin/raw-row boundaries, paused credentials, timeout outcomes, quotas/concurrency, budget exhaustion and restart persistence.

`npm run test:browser` tests the built app with Chromium and axe. It separates the fictional sample from mocked AI clarification. It checks edit/rehearsal/export byte agreement, explicit local save, second-file replay without inference, offline reload/replay, static-only caches, metadata-only compile requests, stale response discard, safe text rendering, schema recovery, desktop/mobile overflow, keyboard focus and automated WCAG AA checks. Automated accessibility checks are not a complete accessibility audit.

Real integration evaluation is deliberately opt-in:

```sh
RUN_LIVE_EVAL=1 node --import tsx scripts/evaluate.ts
```

This spends real credits and keeps `.local/evaluation.sqlite` reservations. Do not delete the ledger to get around limits. Its allocation is $0.65 and two browser-minutes; initial Phase 0 calls and a separately bounded UI demonstration also count toward the owner's total $1 preflight ceiling. The production allocation is separate. There are no automatic paid retries. To rerun a diagnosed case only, append its ID, such as `bangla-trim-case`; ordinary per-case/IP quotas still apply.

`docs/evidence/live-evaluation*.json` records actual model/source outcomes, costs, timings and model identity. Initial failures remain visible. The first Bangla compiler failure cited whole sentences instead of reference IDs; schema validation rejected it. After explicitly constraining the allowed IDs, the affected actual case passed. These small synthetic cases do not certify all language inputs or semantic correctness. Provider timeout/invalid JSON/no-access/quota failure paths are exercised deterministically; no provider outage is manufactured for a marketing claim.

Payoff evidence is deliberately narrow: a second compatible file uses zero new inference calls, including offline replay after static caching. No matched manual baseline, human review-time study, actual personal CSV routine, real-user quote, or time-saving percentage has been measured. Provider latency includes synthetic evaluation overhead and provider cleanup; it is not total user setup/review time. The demo script identifies its contacts as fictional.

Production verification and recording status must be read from the delivery record. Local tests, real provider calls, Render deployment, public functional checks and DEV draft publication are distinct claims.

The fifth browser journey checks the recorded demo: an HTTP 206 byte-range response, correct media type and byte length, actual browser decoding/playback of the 85-second video, and its visible text alternative. The player does not preload the full recording. Desktop/mobile axe checks also include the home page with the player and transcript.
