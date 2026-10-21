import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { sampleCsv, sampleRecipe, secondCsv } from "../../src/shared/sample.js";
import { execute } from "../../src/shared/engine.js";
import { parseCsv } from "../../src/shared/csv.js";

test("fictional sample → edit → exact export → save → second-file replay → offline reload", async ({
  page,
  context,
}) => {
  let compiles = 0;
  page.on("request", (req) => {
    if (req.url().endsWith("/api/recipes/compile")) compiles++;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Try a fictional sample" }).click();
  await expect(
    page.getByRole("button", { name: "Accept & download CSV" }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional, hand-authored sample. No AI call."),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Accept & download CSV" }).click();
  const output = await download;
  expect(await readFile((await output.path())!, "utf8")).toBe(
    execute(parseCsv(sampleCsv), sampleRecipe).csv,
  );
  await page.getByLabel("Step 3 operation").selectOption("uppercase");
  await expect(page.locator(".after")).toContainText("MAYA@EXAMPLE.COM");
  await page.getByLabel("Step 3 operation").selectOption("lowercase");
  await expect(page.locator(".after")).toContainText("maya@example.com");
  await page
    .getByRole("button", { name: "Save routine to this browser" })
    .click();
  await expect(page.getByRole("status")).toContainText("Routine saved");
  await page.getByRole("button", { name: /My routines/ }).click();
  await page.getByRole("button", { name: "Use routine" }).click();
  await page
    .getByLabel("Upload contact CSV")
    .setInputFiles({
      name: "second.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(secondCsv),
    });
  await page.getByRole("button", { name: "Rehearse this file" }).click();
  const secondDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Accept & download CSV" }).click();
  expect(await readFile((await (await secondDownload).path())!, "utf8")).toBe(
    execute(parseCsv(secondCsv), sampleRecipe).csv,
  );
  expect(compiles).toBe(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(async () =>
      page.evaluate(async () =>
        (await caches.keys()).some((k) => k.startsWith("choreseed-")),
      ),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /My routines/ }).click();
  await page.getByRole("button", { name: "Use routine" }).click();
  await page
    .getByLabel("Upload contact CSV")
    .setInputFiles({
      name: "offline.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(secondCsv),
    });
  await page.getByRole("button", { name: "Rehearse this file" }).click();
  await expect(page.locator(".after")).toContainText("rina@example.com");
  expect(compiles).toBe(0);
  const cached = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (k) =>
          (await (await caches.open(k)).keys()).map(
            (r) => new URL(r.url).pathname,
          ),
        ),
      )
    ).flat(),
  );
  expect(cached.some((u) => u.startsWith("/api"))).toBe(false);
  expect(cached).toContain("/");
  expect(cached.some((u) => u.includes("csv.worker-") && u.endsWith(".js"))).toBe(true);
});

test("mocked clarification journey sends metadata only and discards stale paid responses", async ({
  page,
}) => {
  const bodies: any[] = [];
  let calls = 0;
  await page.route("**/api/recipes/compile", async (route) => {
    bodies.push(route.request().postDataJSON());
    calls++;
    if (calls === 1)
      return route.fulfill({
        json: {
          outcome: "needs_clarification",
          questions: ["Which key and keep rule?"],
        },
      });
    return route.fulfill({ json: { outcome: "ready", recipe: sampleRecipe } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Create a routine/ }).click();
  await page
    .getByLabel("Upload contact CSV")
    .setInputFiles({
      name: "private.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        sampleCsv.replace("Maya Khan", "PRIVATE_ROW_SENTINEL"),
      ),
    });
  await page
    .getByLabel("Instructions", { exact: true })
    .fill("Remove duplicate contacts");
  await page.getByRole("checkbox", { name: /I understand/ }).check();
  await page.getByRole("button", { name: "Create my routine" }).click();
  await expect(
    page.getByRole("heading", { name: "One missing decision" }),
  ).toBeVisible();
  await page
    .getByLabel("Your answer")
    .fill(
      "Use Email and keep first. Also trim Name and Email and lowercase Email.",
    );
  await page.getByRole("button", { name: "Answer & compile" }).click();
  await expect(
    page.getByRole("button", { name: "Accept & download CSV" }),
  ).toBeVisible();
  expect(JSON.stringify(bodies)).not.toContain("PRIVATE_ROW_SENTINEL");
  expect(bodies[0]).not.toHaveProperty("rows");
  expect(bodies[1].clarification).toContain("keep first");
});

test("stale/cancelled compilation cannot replace changed instructions", async ({
  page,
}) => {
  let release!: () => void;
  let complete!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const served = new Promise<void>((resolve) => {
    complete = resolve;
  });
  await page.route("**/api/recipes/compile", async (route) => {
    await gate;
    await route
      .fulfill({ json: { outcome: "ready", recipe: sampleRecipe } })
      .catch(() => {});
    complete();
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Create a routine/ }).click();
  await page
    .getByLabel("Upload contact CSV")
    .setInputFiles({
      name: "x.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(sampleCsv),
    });
  await page.getByLabel("Instructions", { exact: true }).fill("Trim Name");
  await page.getByRole("checkbox", { name: /I understand/ }).check();
  await page.getByRole("button", { name: "Create my routine" }).click();
  await page
    .getByLabel("Instructions", { exact: true })
    .fill("Uppercase Name instead");
  release();
  await served;
  await expect(
    page.getByRole("button", { name: "Create my routine" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept & download CSV" }),
  ).toHaveCount(0);
});

test("mobile/desktop accessibility, keyboard focus, hostile cell rendering and schema recovery", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Choreseed home" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Try a fictional sample" }).click();
    await expect(
      page.getByRole("button", { name: "Accept & download CSV" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "Use another file" }).click();
  await page
    .getByLabel("Upload contact CSV")
    .setInputFiles({
      name: "bad.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Other\nvalue"),
    });
  await expect(page.getByRole("alert")).toContainText("Schema mismatch");
  await page
    .getByLabel("Upload contact CSV")
    .setInputFiles({
      name: "html.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Name,Email,Customer ID\n<img src=x onerror=alert(1)>,x@example.com,001",
      ),
    });
  await page.getByRole("button", { name: "Rehearse this file" }).click();
  await expect(page.locator(".after")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  expect(await page.locator(".after img").count()).toBe(0);
});
