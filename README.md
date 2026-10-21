# Choreseed

**A little less by hand.** Turn contact CSV instructions and selected guidance into a small routine you can inspect, edit, export and run again without another AI call.

Built for the [Hacktoberfest Open-Source AI Challenge, Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19). This is an early release, not a general spreadsheet or arbitrary-code agent. All demo contacts are fictional.

[Free public preview](https://choreseed.onrender.com) · [85-second real-integration recording](docs/assets/choreseed-demo.webm) · [Delivery status](docs/DELIVERY.md)

**Live AI is deliberately paused in the free preview.** Paid persistent Render hosting returned HTTP 402 requiring payment information; the owner's no-new-card constraint is preserved. Local real-provider creation and browser-local replay are verified. Full public production acceptance remains blocked; see the delivery record.

## What works

- Contact CSVs: UTF-8 with optional BOM, comma/semicolon detection and override, 2 MB / 10,000 rows / 50 columns.
- Typed steps: selected-field trim, explicit lowercase/uppercase, rename, explicit-key deduplication with keep first/last, completely empty row removal.
- Clarification before an ambiguous plan; editable ordered steps, before/after tables, changed-cell audit and excluded-row reasons.
- Download a new CSV, export/import a versioned recipe, explicitly save recipes in IndexedDB and replay on compatible files. Header order can change; the unique header set must match.
- Blank dedupe keys stay separate. Values remain strings, including leading zeros. Spreadsheet-safe escaping defaults on and is visible in the preview.
- Cached static application and saved-routine replay work offline. Hosted AI creation and URL reading require a connection and remaining allocation.

## Run locally

Use Node **24.19.0** and the existing checkout. Cloud tasks are already isolated; do not create a worktree unless explicitly requested.

```sh
npm ci
npm test
npm run build
npm start
```

For development, `npm run dev` starts Fastify on port 3000 and Vite on 5173. A missing provider key gives an honest paused state; the fictional sample and local replay remain available.

```sh
npm run test:browser
```

Browser tests use `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to another trusted installed Chromium executable. Test reports and SQLite files are ignored. Live evaluation is opt-in and paid: see [testing](docs/TESTING.md), not the default test command.

See [setup and deployment](docs/SETUP.md), [privacy and limitations](docs/PRIVACY.md), [architecture and accounting](docs/ARCHITECTURE.md), [competition rules](docs/CHALLENGE.md) and [attribution](THIRD_PARTY_NOTICES.md).

## The AI boundary

CSV parsing and transformations happen in a browser Web Worker. The backend accepts **headers, instructions, clarification and selected reference excerpts**, never an automated upload of raw rows. Do not put sensitive personal data in instructions or notes.

The selected open-weight model is **Qwen3.5-35B-A3B through Backboard/OpenRouter, pinned to `deepinfra/fp8`**, with fallback, memory and web search disabled. Qwen3-32B was evaluated first; malformed output and weak Bangla results led to the explicitly documented replacement. No closed-model substitution or automatic model router is used. Hosted inference is not local, offline, or guaranteed private. A `ready` response means preview-ready, not approved or guaranteed correct.

Browserbase reads up to three public reference URLs, with at most 4,000 selected characters per source. Initial supported hosts: Python documentation, MDN, Microsoft Support, Google Support and freeCodeCamp. Login-required content, videos without permitted notes/transcripts, blocked content and other hosts use pasted notes instead. Citations must exist, but existence alone does not establish that they support a step.

## Evidence and status

Independent deterministic fixtures, API/accounting tests, browser journeys and real-provider results are reported separately in [testing](docs/TESTING.md) and `docs/evidence/`. The first live evaluations include failures, retained for transparency. No fabricated users, savings percentages, personal CSV usage, competitor benchmarks or prize guarantees are claimed.

Original code is [MIT licensed](LICENSE). AI-assisted development: this project was implemented and evaluated with OpenAI Codex under the owner's product direction. Provider calls in evaluation used synthetic data. Optional agent-session sharing is not enabled.

Commits after the challenge deadline, if any, must be noted here. The applicable deadline is October 25, 2026 at 11:59 PM PDT (October 26 at 12:59 PM Asia/Dhaka). No post-deadline commit is claimed in the initial delivery.
