*This is a submission draft for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).*

> Delivery note before publication: Render reports the free preview deployed. Its intended capabilities are the fictional sample and local replay; live generation is deliberately paused. Public functional verification is still pending because this cloud machine's egress policy has not applied the newly saved deployment hostname. Real hosted-model compilation and Browserbase reading were verified in the development instance and recorded below. A paid persistent Render service returned HTTP 402 requiring payment information, despite available account credit; I have not added a card or enabled paid inference on ephemeral storage. This article is an unpublished draft, not a claim that full production acceptance is complete.

## What I Built

I can collect a lot of advice before I start something: websites, videos, AI conversations, another promising explanation. The pile grows faster than my confidence about what to do with it.

For this challenge, I chose one small place to stop collecting and start rehearsing: cleaning a contact CSV.

**Choreseed turns instructions and selected guidance into a routine you can inspect, keep, and run again.** The useful thing left behind is not another conversation. It is a little portable plan.

The intended user is someone who needs to tidy a customer or contact list without writing code: a freelancer, an individual, or a small team. This is a deliberately narrow first release. It trims selected fields, changes letter case when asked, renames columns, removes completely empty rows, and deduplicates by an explicit key and keep rule.

The contacts in the demo are fictional. My research fatigue is the real starting point; I am not claiming this fictional list is a personal daily workflow or that other people have adopted the app.

## Demo

- [Free public preview deployment](https://choreseed.onrender.com) — public functional verification pending; live AI is paused pending persistent hosting and runtime credentials.
- [85-second recorded real-integration demonstration](https://github.com/tanzilamd/choreseed/blob/main/docs/assets/choreseed-demo.webm).

The recording uses the local development app, real Backboard inference, and real Browserbase reading. It condenses a roughly two-minute automated fictional journey into sampled playback; it is not a real-time human usability measurement.

![The Choreseed rehearsal workbench, with fictional contacts and editable steps](https://raw.githubusercontent.com/tanzilamd/choreseed/main/docs/assets/workbench-desktop.png)

Here is the moment I wanted to earn:

1. Give it a messy contact CSV and a plain-language instruction.
2. Let it ask which duplicate key to use and whether to keep the first or last occurrence.
3. Review the ordered steps, actual changed cells, and excluded rows.
4. Download a new CSV and explicitly save the routine.
5. Choose the next compatible file. Run the same routine. **No new prompt and no new inference.**

The second file even has its columns in a different order. The header set still has to match exactly; Choreseed blocks schema drift instead of silently remapping fields.

## Code

{% github tanzilamd/choreseed %}

The original application code is MIT licensed. [Setup](https://github.com/tanzilamd/choreseed/blob/main/docs/SETUP.md), [privacy and limitations](https://github.com/tanzilamd/choreseed/blob/main/docs/PRIVACY.md), [attribution](https://github.com/tanzilamd/choreseed/blob/main/THIRD_PARTY_NOTICES.md), and [test evidence](https://github.com/tanzilamd/choreseed/tree/main/docs/evidence) are in the repository.

## How I Built It

The model has one job: interpret the task and propose constrained data.

Instructions, column names, clarification, and selected reference excerpts go to a Fastify backend. Backboard calls the open-weight **Qwen3.5-35B-A3B** model through OpenRouter, pinned to the `deepinfra/fp8` upstream. Memory, web search, provider fallback, and automatic model routing are off.

The model returns one of three outcomes: a clarification question, a preview-ready recipe, or an explanation that the request is outside the supported scope. Zod and additional semantic checks reject unknown columns, rename collisions, invented source IDs, unsupported steps, and arbitrary executable code.

The CSV itself stays in a browser Web Worker. PapaParse preserves strings, including leading zeros. Deterministic code applies the steps, computes the audit, and exports a new file. Saved recipes use IndexedDB only after an explicit save. Raw files are not persisted.

Optional public references are read through bounded Browserbase sessions. The user can review and edit the selected excerpts before compilation. Three sources maximum; 4,000 characters per source; visible truncation; pasted notes for blocked content or permitted video transcripts. Fetched pages are untrusted data, not instructions to the agent.

### A failure worth keeping

I started with Qwen3-32B. It produced malformed JSON in one probe and weak Bangla results. I documented that outcome and tested a newer Apache-2.0 licensed open-weight model, rather than silently substituting a closed model.

The newer model then hit a smaller, useful failure: its Bangla cleanup operations were correct, but it quoted the instruction sentences where the recipe required reference IDs. Validation rejected the result. I made the allowed IDs explicit in the prompt and reran the affected real case. It passed.

That distinction matters. A plausible answer is not yet a usable routine. And a valid citation ID still does not prove that its source supports the step: the workbench asks the user to review the guidance and the proposed behavior.

### Small boundaries do real work

Empty dedupe keys are kept separately. Retained records keep their original order. Completely empty rows mean empty string values; whitespace disappears only where a trim step says so. Formula-like spreadsheet cells are escaped by default, with the actual escaping visible in the preview.

I stopped before fuzzy matching, date or currency calculations, joins, XLSX/PDF processing, and arbitrary Python or JavaScript. Each would make “review this small routine” a different promise.

The intended public AI demo also needs durable accounting. SQLite records reservations before paid dispatch, including failed or uncertain attempts, and retains them across restarts. Limits are three attempts per anonymous session/day, three per IP/hour, and one pending inference. Pricing and native model limits are checked before dispatch; provider uncertainty does not become a supposed refund. The current free preview keeps live AI off because an ephemeral disk cannot uphold that promise.

## Why Open Innovation Matters

The open-weight model performs the core semantic work. It turns an English or Bangla task into a structured plan; it is not merely a development assistant attached to a conventional cleaner.

The other durable part is open too: the recipe format, validator, interpreter, and UI can be inspected, modified, and exported. A routine is not trapped in an AI chat. Once reviewed and saved, replay needs neither an inference provider nor a new model response.

That is the tested offline capability: **cached app plus saved recipe plus compatible local CSV**. Creation still uses hosted inference. I am not calling it local inference, guaranteeing provider zero retention, or claiming model substitution/self-hosting has been tested.

## The Lazy Payoff

The strongest measurement is a count: **zero new inference calls on the second file**. The recorded journey checked that count, and both downloaded files matched independent expected rows. Browser tests also replayed a saved routine after an offline reload and verified that API responses were absent from the static cache.

The build has deterministic/API/accounting tests, separate browser journeys, and real-provider evaluation records. The real semantic cases include English contact cleanup, Bangla trim/case instructions, ambiguous duplicates, unsupported requests, hostile notes, and conflicting guidance. Failures and the targeted correction remain in the evidence.

I have not measured a matched manual baseline or human review time. The setup still asks for care. Choreseed's hypothesis is that the care can leave behind something reusable, instead of being spent again on the next file.

Slow and steady, with a smaller chore waiting tomorrow.

## Prize Categories

The implementation meaningfully uses Backboard for open-weight semantic compilation and Browserbase for public reference reading. Those are the partner categories I would enter after final readiness review. Render currently hosts a free preview; the intended persistent live deployment is blocked as described above, so I am not presenting that part as complete.

AI-assisted development disclosure: I directed the product and used OpenAI Codex to implement, test, and document it. The evaluation data and recorded contacts are synthetic. No private agent-session export or DevRelay upload was made.
