// Records a synthetic, automated REAL-integration demonstration. Not a human timing study.
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { sampleCsv, secondCsv } from "../src/shared/sample.js";
const root = ".local/demo-frames";
await mkdir(root, { recursive: true });
await mkdir("docs/assets", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce",
});
const started = Date.now();
let done = false;
let frame = 0;
const posts: any[] = [];
let caption =
  "Fictional contacts. A real open-weight model. Your file stays in the browser.";
page.on("request", (req) => {
  if (req.url().includes("/api/") && req.method() === "POST")
    posts.push({
      endpoint: new URL(req.url()).pathname,
      body: req.postDataJSON(),
    });
});
async function annotate(text: string) {
  caption = text;
  await page.evaluate((text) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText =
        "position:fixed;left:20px;right:20px;bottom:14px;z-index:1000;background:#263e2c;color:white;padding:12px 20px;border-radius:8px;font:14px system-ui;box-shadow:0 3px 20px #0003";
      document.body.append(el);
    }
    el.textContent = "DEMO RECORDING · " + text;
  }, text);
}
const captures = (async () => {
  while (!done) {
    try {
      await page.screenshot({
        path: `${root}/frame-${String(frame++).padStart(3, "0")}.jpg`,
        type: "jpeg",
        quality: 85,
      });
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
})();
const evidence: any = {
  observedAt: new Date().toISOString(),
  kind: "scripted synthetic real-integration journey; local app, hosted providers",
  stages: [],
};
try {
  await page.goto(process.env.DEMO_BASE_URL || "http://127.0.0.1:3000");
  await annotate(caption);
  await page.screenshot({ path: "docs/assets/start-desktop.png" });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: /^Create a routine/ }).click();
  await page
    .getByLabel("Upload contact CSV")
    .setInputFiles({
      name: "fictional-contacts.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(sampleCsv),
    });
  await page
    .getByLabel("Instructions", { exact: true })
    .fill(
      "Trim Name and Email. Lowercase Email. Remove completely empty rows and duplicate contacts.",
    );
  await annotate(
    "Describe the chore in ordinary words. Rows stay local; only headers and chosen guidance are sent.",
  );
  await page.locator(".references summary").click();
  await page.getByRole("button", { name: "+ Add reference" }).click();
  await page.locator(".source select").selectOption("url");
  await page
    .locator(".source textarea")
    .first()
    .fill("https://docs.python.org/3/library/stdtypes.html#str.strip");
  await page.getByRole("checkbox", { name: /I understand/ }).check();
  await page.getByRole("button", { name: "Read public URLs" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "References read." })
    .waitFor({ timeout: 45000 });
  evidence.stages.push({
    stage: "source-read",
    elapsedMs: Date.now() - started,
  });
  await annotate(
    "Browserbase read the public Python reference. Review the selected excerpt; it is untrusted guidance.",
  );
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Create my routine" }).click();
  await page
    .getByRole("heading", { name: "One missing decision" })
    .waitFor({ timeout: 100000 });
  await annotate(
    "The model asks which key and which occurrence to keep. No silent deduplication guess.",
  );
  await page
    .getByLabel("Your answer")
    .fill(
      "Deduplicate by Email, keeping the first occurrence. Keep blank Email keys separate.",
    );
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Answer & compile" }).click();
  await page
    .getByRole("button", { name: "Accept & download CSV" })
    .waitFor({ timeout: 100000 });
  await annotate(
    "A validated recipe is preview-ready, not automatically approved. Review steps and the actual changes.",
  );
  await page.screenshot({
    path: "docs/assets/workbench-desktop.png",
    fullPage: true,
  });
  await page.waitForTimeout(4000);
  const first = page.waitForEvent("download");
  await page.getByRole("button", { name: "Accept & download CSV" }).click();
  const firstPath = await (await first).path();
  evidence.firstOutput = await readFile(firstPath!, "utf8");
  await page
    .getByRole("button", { name: "Save routine to this browser" })
    .click();
  await page.getByRole("status").filter({ hasText: "Routine saved" }).waitFor();
  evidence.scriptedSetupIncludingSourceClarificationReviewMs =
    Date.now() - started;
  const before = posts.filter((p) => p.endpoint.endsWith("/compile")).length;
  const replayStart = Date.now();
  await page.getByRole("button", { name: /My routines/ }).click();
  await page.getByRole("button", { name: "Use routine" }).click();
  await page
    .getByLabel("Upload contact CSV")
    .setInputFiles({
      name: "fictional-next-file.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(secondCsv),
    });
  await page.getByRole("button", { name: "Rehearse this file" }).click();
  await annotate(
    "The second compatible file reuses the routine. Zero new AI calls. Header order can change.",
  );
  const second = page.waitForEvent("download");
  await page.getByRole("button", { name: "Accept & download CSV" }).click();
  evidence.secondOutput = await readFile(
    (await (await second).path())!,
    "utf8",
  );
  evidence.scriptedReplayMs = Date.now() - replayStart;
  evidence.repeatCompileCalls =
    posts.filter((p) => p.endpoint.endsWith("/compile")).length - before;
  evidence.compileCalls = before;
  evidence.rawRowsAbsentFromRequests =
    !JSON.stringify(posts).includes("MAYA@example.com");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/assets/workbench-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await annotate(
    "Export a new CSV or portable JSON. Save locally, replay offline after caching. Fictional data; no human time-saving claim.",
  );
  if (Date.now() - started < 90000)
    await page.waitForTimeout(90000 - (Date.now() - started));
  evidence.passed = true;
} catch (error) {
  evidence.passed = false;
  evidence.errorType = (error as Error).name;
  console.log("Demo journey failed:", (error as Error).name);
} finally {
  done = true;
  await captures;
  evidence.frames = frame;
  evidence.durationMs = Date.now() - started;
  await writeFile(
    "docs/evidence/demo-journey.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  await browser.close();
  console.log(
    JSON.stringify({
      passed: evidence.passed,
      frames: frame,
      durationMs: evidence.durationMs,
      repeatCompileCalls: evidence.repeatCompileCalls,
    }),
  );
  if (!evidence.passed) process.exitCode = 1;
}
