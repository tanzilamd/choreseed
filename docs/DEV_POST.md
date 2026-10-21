*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19).*

## What I Built

Before I start something, I tend to collect advice: websites, videos, AI conversations, one more explanation. Then I spend my energy deciding which pieces apply and where to begin.

For this challenge, I picked one small chore: cleaning a contact CSV. I wanted the effort of figuring it out to leave behind something I could use again.

**Choreseed turns ordinary instructions and selected guidance into a routine you can inspect, rehearse, save, and replay.**

It is for individuals, freelancers, and small teams who need to tidy contact or customer lists without writing code. The first release handles selected-field trimming, explicit case changes, column renaming, completely empty rows, and deduplication with an explicit key and keep rule.

The useful part happens on the next file: load the saved routine, choose a compatible CSV, and run it. No new prompt or inference.

## Demo

**[Watch the 85-second real-integration recording](https://choreseed.onrender.com/demo.webm)** · [GitHub video mirror](https://github.com/tanzilamd/choreseed/blob/main/docs/assets/choreseed-demo.webm)

**[Try the free preview](https://choreseed.onrender.com)** — choose **Try a fictional sample**, edit its steps, download the output, and save the routine. A video and text transcript are on the home page.

The recording uses the development app with **real Backboard inference and real Browserbase reference reading**. Its contacts are fictional, and playback condenses a roughly two-minute scripted run. My research fatigue is real; the demo is not a claim about personal CSV usage, customers, or human time saved.

**Current hosting limit:** live AI creation and public-source reading are paused in the free preview until usage accounting has durable storage. The sample, imported routines, and local replay work. The recording demonstrates the full creation workflow; it is separate from the deployed preview. Free hosting can sleep between visits.

![Editable steps, before-and-after contacts, and an audit of actual changes. All contacts are fictional.](https://raw.githubusercontent.com/tanzilamd/choreseed/main/docs/assets/workbench-desktop.png)

The recording starts with this instruction:

> Trim Name and Email. Lowercase Email. Remove completely empty rows and duplicate contacts.

“Duplicate contacts” leaves a decision unresolved. The model asks which key and which occurrence to keep. I answer: **Email, keep first; keep blank Email keys separate.**

After review, six fictional input rows become four output rows. Leading-zero IDs stay strings. Two rows with missing emails survive separately. The original file stays untouched.

Then a second file arrives with the same headers in a different order. The saved routine handles it with **zero additional AI calls**. A changed header set is blocked, rather than silently remapped.

## Code

{% github tanzilamd/choreseed %}

Original code is **MIT licensed**. The repository includes [setup](https://github.com/tanzilamd/choreseed/blob/main/docs/SETUP.md), [privacy and limitations](https://github.com/tanzilamd/choreseed/blob/main/docs/PRIVACY.md), [model/dependency attribution](https://github.com/tanzilamd/choreseed/blob/main/THIRD_PARTY_NOTICES.md), and [actual evaluation evidence](https://github.com/tanzilamd/choreseed/tree/main/docs/evidence).

## How I Built It

The model interprets the task. Deterministic code changes the data.

A React/TypeScript workbench sends instructions, column names, clarification, and selected reference excerpts to Fastify. Backboard calls the open-weight **[Qwen3.5-35B-A3B](https://huggingface.co/Qwen/Qwen3.5-35B-A3B)**, pinned through OpenRouter to `deepinfra/fp8`. Memory, web search, provider fallback, and automatic model routing are off.

The result is a typed recipe, a necessary clarification, or an actionable unsupported-operation response. Zod and semantic validation reject unknown columns, rename collisions, invented reference IDs, unsupported steps, and executable code. “Ready” means ready to preview; the user still reviews it.

The raw CSV stays in a browser Web Worker. PapaParse preserves strings. The interpreter applies ordered steps, computes changed cells and excluded rows, and exports a new CSV. Formula-like cells receive spreadsheet-safe escaping by default, visible in the preview. Explicit saves store recipes in IndexedDB, not raw files.

Browserbase reads supported public references in bounded, read-only sessions. Users review the excerpts before compilation: at most three sources and 4,000 characters per source, with visible truncation and a paste fallback. Source text is untrusted data. A citation ID existing does not establish that its source supports the proposed step.

### Two failures that improved the result

Qwen3-32B produced malformed output in an early probe and weak Bangla results. I documented the failure and tested an explicitly named replacement, rather than silently changing models.

The replacement then produced correct Bangla operations but put quoted instructions where reference IDs belonged. Validation rejected it. I made the allowed IDs explicit and reran the affected real case successfully.

A final public offline test also caught a build-marker bug: the service worker had an empty asset list. I fixed the injection, made a missing marker fail the build, redeployed, and repeated the public journey. Cached-app replay then passed. Both failures remain in the evidence.

The backend implements conservative paid-request reservations and session/IP quotas in SQLite. Restart-persistence tests pass with a persistent local ledger. The free host has an ephemeral filesystem, so public live AI stays off; a free-database provisioning API block remains unresolved. Public live-AI quota persistence has **not** been verified.

## Why Does Open Innovation Matter?

The Apache-2.0 open-weight model does the core semantic work: turning an English or Bangla instruction into a constrained plan. Its identity, weights, and license are available for inspection. Evaluating and explicitly replacing the first model was a real part of building the application.

The recipe schema and MIT interpreter are also inspectable and modifiable. A user can export the routine as JSON, keep it, and run it again without buying another model response. That makes the result portable beyond the original AI conversation.

The tested offline capability is precise: **cached app + saved recipe + compatible local CSV**. Creation uses hosted inference. Local inference, self-hosted models, and provider zero retention are not claimed.

## The Lazy Payoff

The measured result is **zero new inference calls on the second compatible file**. Both recorded exports matched independent expected rows. Public downloads also matched independently written CSV bytes; public offline replay passed without caching API responses.

Validation includes **22 deterministic/API/compiler/accounting tests and five browser journeys**, plus real English/Bangla model cases and real reference reading. Fictional samples, mocked failures, and actual provider results are identified separately.

I have not measured a matched manual baseline or human review time. First setup still takes care: source reading, clarification, provider waits, and review all count. The hypothesis is that this care can leave behind a reusable routine, instead of being spent again on the next file.

That is my version of “Slow and Steady”: do the deciding once, keep the small routine, and bring it the next file.

## Prize Categories

- **Best Use of Backboard:** actual open-weight model comparison and semantic compilation through Backboard.
- **Best Use of Browserbase:** actual public reference reading supplies reviewed context to the compiler; browser journeys also verify the application.

AI-assisted development disclosure: I directed the product and used OpenAI Codex to implement, test, and document it. All recorded contacts and evaluation fixtures are synthetic. No private agent-session export or DevRelay upload was made.
