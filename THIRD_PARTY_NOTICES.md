# Attribution

Original Choreseed application code and its seed/loop identity are MIT licensed. No model weights are bundled or redistributed.

- [Qwen3.5-35B-A3B](https://huggingface.co/Qwen/Qwen3.5-35B-A3B): Qwen team, Apache-2.0 model license; used through hosted Backboard/OpenRouter inference, pinned to DeepInfra FP8. The initially evaluated [Qwen3-32B](https://huggingface.co/Qwen/Qwen3-32B) is also Apache-2.0. Model-card license metadata was checked during setup.
- [React](https://react.dev), [Vite](https://vite.dev), [Fastify](https://fastify.dev), [Zod](https://zod.dev), [PapaParse](https://www.papaparse.com), [ws](https://github.com/websockets/ws), [https-proxy-agent](https://github.com/TooTallNate/proxy-agents), [Undici](https://github.com/nodejs/undici): respective maintainers; MIT licenses. Related Fastify plugins and React types retain their own distributed notices.
- [idb](https://github.com/jakearchibald/idb): Jake Archibald and contributors, ISC license.
- [TypeScript](https://www.typescriptlang.org) and [Playwright](https://playwright.dev): Microsoft and contributors, Apache-2.0 licenses.
- [axe-core](https://github.com/dequelabs/axe-core): Deque Systems and contributors, MPL-2.0; used in development accessibility checks, not shipped in the application.
- [Node.js](https://nodejs.org): Node.js contributors, MIT and bundled third-party licenses. SQLite uses the Node built-in SQLite API.
- Browserbase, Backboard, OpenRouter and Render are hosted services governed by their respective terms. Their use does not make the entire hosted stack open source.

Exact dependency versions and integrity hashes are in `package-lock.json`; dependency packages include their complete licenses. System fonts only; no remote font or third-party illustration is used. Reference pages are linked and read on explicit request, not bundled into the application.
