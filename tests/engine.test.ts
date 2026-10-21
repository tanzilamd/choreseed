import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, exportCsv, spreadsheetSafe } from "../src/shared/csv.js";
import { execute } from "../src/shared/engine.js";
import {
  validateRecipe,
  type Operation,
  type Recipe,
} from "../src/shared/recipe.js";
import { sampleCsv, sampleRecipe, secondCsv } from "../src/shared/sample.js";
const recipe = (headers: string[], operations: Operation[]): Recipe => ({
  version: 1,
  title: "Test",
  requiredHeaders: headers,
  operations,
  assumptions: [],
  sources: [
    {
      id: "instruction",
      kind: "instruction",
      label: "Independent test fixture",
    },
  ],
  model: { id: "test-fixture", provider: "none", upstream: "none" },
});
const refs = { references: ["instruction"] };
test("fictional contact fixture: independent expected rows, changes and exclusions", () => {
  const result = execute(parseCsv(sampleCsv), sampleRecipe);
  assert.deepEqual(result.rows, [
    ["Maya Khan", "maya@example.com", "0012"],
    ["Sami Roy", "sami@example.com", "0007"],
    ["No email", "", "0009"],
    ["Another no email", "", "0010"],
  ]);
  assert.deepEqual(result.excluded, [
    { row: 3, reason: "Duplicate Email (keep first)" },
    { row: 7, reason: "Completely empty row" },
  ]);
  assert.equal(result.changes.length, 4);
  assert.deepEqual(parseCsv(result.csv).rows, result.rows);
});
test("reordered headers replay without remapping or mutating input", () => {
  const table = parseCsv(secondCsv);
  const original = structuredClone(table);
  const result = execute(table, sampleRecipe);
  assert.deepEqual(result.rows, [
    ["0021", "rina@example.com", "Rina Das"],
    ["0023", "lee@example.com", "Lee Park"],
  ]);
  assert.deepEqual(table, original);
  assert.throws(
    () => execute({ ...table, headers: ["ID", "Email", "Name"] }, sampleRecipe),
    /Schema mismatch/,
  );
});
test("Unicode/Bangla whitespace and explicit case preserve strings and leading zeros", () => {
  const table = parseCsv(
    'নাম,Code,Email\n"\u2003 রিনা দাস \u00a0",0007,ÄBC@EXAMPLE.COM',
  );
  const out = execute(
    table,
    recipe(table.headers, [
      { ...refs, type: "trim", column: "নাম" },
      { ...refs, type: "lowercase", column: "Email" },
    ]),
  );
  assert.deepEqual(out.rows, [["রিনা দাস", "0007", "äbc@example.com"]]);
});
test("quoted commas, quoted newlines, semicolons and BOM", () => {
  const t = parseCsv('\uFEFFName;Note\r\n"A, B";"line one\nline two"\r\n', ";");
  assert.deepEqual(t.rows, [["A, B", "line one\nline two"]]);
  assert.deepEqual(parseCsv(exportCsv(t.headers, t.rows, ";"), ";"), t);
});
test("keep-last retains original order and every incomplete compound key", () => {
  const t = parseCsv("A,B,ID\nx,y,01\n,y,02\nx,y,03\nx,,04\n ,y,05");
  assert.deepEqual(
    execute(
      t,
      recipe(t.headers, [
        { ...refs, type: "deduplicate", key: ["A", "B"], keep: "last" },
      ]),
    ).rows,
    [
      ["", "y", "02"],
      ["x", "y", "03"],
      ["x", "", "04"],
      [" ", "y", "05"],
    ],
  );
});
test("dedupe tuple keys cannot collide through separator characters", () => {
  const t = parseCsv('A,B\n"a|b",c\na,"b|c"');
  assert.equal(
    execute(
      t,
      recipe(t.headers, [
        { ...refs, type: "deduplicate", key: ["A", "B"], keep: "first" },
      ]),
    ).rows.length,
    2,
  );
});
test("only completely empty strings are empty rows; trimming can make a row empty", () => {
  const t = parseCsv("A,B\n,\n ,\n0,");
  assert.deepEqual(
    execute(t, recipe(t.headers, [{ ...refs, type: "remove_empty_rows" }]))
      .rows,
    [
      [" ", ""],
      ["0", ""],
    ],
  );
  assert.deepEqual(
    execute(
      t,
      recipe(t.headers, [
        { ...refs, type: "trim", column: "A" },
        { ...refs, type: "remove_empty_rows" },
      ]),
    ).rows,
    [["0", ""]],
  );
});
test("rename collision/unknown fields/duplicate keys/invented sources rejected", () => {
  assert.throws(
    () =>
      validateRecipe(
        recipe(["A", "B"], [{ ...refs, type: "rename", column: "A", to: "B" }]),
      ),
    /collision/,
  );
  assert.throws(
    () =>
      validateRecipe(recipe(["A"], [{ ...refs, type: "trim", column: "B" }])),
    /Unknown column/,
  );
  assert.throws(
    () =>
      validateRecipe(
        recipe(
          ["A"],
          [{ ...refs, type: "deduplicate", key: ["A", "A"], keep: "first" }],
        ),
      ),
    /keys/,
  );
  assert.throws(
    () =>
      validateRecipe(
        recipe(
          ["A"],
          [{ references: ["invented"], type: "trim", column: "A" }],
        ),
      ),
    /unknown source/,
  );
});
test("rename sequencing changes later field names, not cell order", () => {
  const t = parseCsv("A,B\n hi ,0");
  const out = execute(
    t,
    recipe(t.headers, [
      { ...refs, type: "rename", column: "A", to: "Name" },
      { ...refs, type: "trim", column: "Name" },
    ]),
  );
  assert.deepEqual(out.headers, ["Name", "B"]);
  assert.deepEqual(out.rows, [["hi", "0"]]);
});
test("malformed rows, quotes, blank/duplicate headers, invalid UTF-8, file/row/column limits", () => {
  for (const text of [
    "A,A\n1,2",
    ",B\n1,2",
    "A,B\n1",
    'A,B\n"unclosed,2',
    "A\n\uFFFD",
    "",
  ])
    assert.throws(() => parseCsv(text));
  assert.throws(() => parseCsv("A\n" + "x".repeat(2 * 1024 * 1024)), /2 MB/);
  assert.throws(
    () => parseCsv("A\n" + Array(10001).fill("x").join("\n")),
    /10,000/,
  );
  assert.throws(
    () => parseCsv(Array.from({ length: 51 }, (_, i) => "C" + i).join(",")),
    /1–50/,
  );
});
test("spreadsheet escaping is visible and preview exactly matches downloaded bytes", () => {
  for (const value of [
    "=SUM(1,2)",
    " +cmd",
    "-1",
    "@evil",
    "\ttext",
    "\rtext",
    "\ntext",
  ])
    assert.equal(spreadsheetSafe(value), "'" + value);
  assert.equal(spreadsheetSafe("0012"), "0012");
  assert.equal(spreadsheetSafe("'=already"), "'=already");
  const t = parseCsv('A\n"=1+1"');
  const r = recipe(["A"], [{ ...refs, type: "trim", column: "A" }]);
  const out = execute(t, r);
  assert.deepEqual(out.rows, [["'=1+1"]]);
  assert.equal(out.changes[0].reason, "Includes spreadsheet-safe escaping");
  assert.deepEqual(parseCsv(out.csv).rows, out.rows);
  assert.equal(execute(t, r, false).rows[0][0], "=1+1");
});
test("import rejects arbitrary code, unknown versions, malicious links and missing keep rule", () => {
  const r = recipe(["A"], [{ ...refs, type: "trim", column: "A" }]);
  for (const bad of [
    { ...r, version: 2 },
    { ...r, code: "eval()" },
    { ...r, operations: [{ ...refs, type: "execute", code: "x" }] },
    { ...r, operations: [{ ...refs, type: "deduplicate", key: ["A"] }] },
    {
      ...r,
      sources: [
        {
          id: "instruction",
          kind: "url",
          label: "unsafe",
          url: "javascript:alert(1)",
        },
      ],
    },
  ])
    assert.throws(() => validateRecipe(bad));
});
