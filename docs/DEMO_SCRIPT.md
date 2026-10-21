# Approximately 90-second demo

Recording: `docs/assets/choreseed-demo.webm`, 85 seconds. It samples an actual 120-second automated synthetic journey, including real provider waits. The timing is condensed playback, not a human setup/review study. Exact scripted stage times and downloaded fictional outputs are retained in `docs/evidence/demo-journey.json`.

The deployed home page provides a native video player and an expandable text transcript. Direct media URL: `https://choreseed.onrender.com/demo.webm`; the repository copy is the mirror. The fixed media route supports byte ranges for seeking. The video is silent with on-screen English explanations; it is not a recording of the paused public preview.

| Approximate segment | Show | English narration/caption |
| --- | --- | --- |
| 0–8 s | Start page | “I collect advice faster than I apply it. Choreseed makes one small task leave behind a routine.” |
| 8–22 s | Fictional CSV, instructions, privacy consent | “These contacts are fictional. Rows stay in the browser. Only headers, instructions and selected guidance go to hosted AI.” |
| 22–35 s | Actual Browserbase reference excerpt | “Bring the useful part of a public source, or paste your own notes. Review what the model will receive.” |
| 35–50 s | Actual clarification | “Duplicates need a key and a keep rule. The model asks instead of choosing silently.” |
| 50–65 s | Workbench, steps, changed cells, excluded rows | “Preview-ready is not approved. Review, edit and rehearse. Deterministic code makes the actual changes.” |
| 65–75 s | Download and explicit local save | “Keep the original. Download a new CSV and save the portable routine.” |
| 75–85 s | Second file with reordered columns, replay | “Next file, same routine. No new prompt or inference. Offline replay works after the app is cached.” |

Recording demonstrates the local app with real hosted integrations. The public Render preview deliberately pauses live AI until persistent usage storage is available; runtime key presence is verified. Separate public-browser evidence covers the free preview. Do not relabel the recording as a public live-AI production smoke test.

Screenshots: `start-desktop.png`, `workbench-desktop.png`, `workbench-mobile.png`. The overlay explicitly identifies the synthetic demonstration. The original recording script is opt-in, invokes real paid APIs, and must not be rerun without checking the remaining preflight budget and existing ledger.
