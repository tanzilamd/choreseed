import { compatible, validateRecipe, type Recipe } from "./recipe.js";
import { exportCsv, spreadsheetSafe, type Table } from "./csv.js";
export type Preview = {
  headers: string[];
  rows: string[][];
  originalIndices: number[];
  excluded: { row: number; reason: string }[];
  changes: {
    row: number;
    column: string;
    before: string;
    after: string;
    reason: string;
  }[];
  escapedHeaders: string[];
  csv: string;
};
export function execute(table: Table, input: Recipe, safe = true): Preview {
  const recipe = validateRecipe(input);
  if (!compatible(recipe.requiredHeaders, table.headers))
    throw new Error(
      "Schema mismatch. Use the same unique header set; header order may change. No columns were remapped.",
    );
  let headers = [...table.headers];
  let rows = table.rows.map((cells, index) => ({ cells: [...cells], index }));
  const excluded: Preview["excluded"] = [];
  for (const op of recipe.operations) {
    if (op.type === "rename") {
      headers = headers.map((h) => (h === op.column ? op.to : h));
      continue;
    }
    if (op.type === "remove_empty_rows") {
      rows = rows.filter((r) => {
        const empty = r.cells.every((c) => c === "");
        if (empty)
          excluded.push({ row: r.index + 2, reason: "Completely empty row" });
        return !empty;
      });
      continue;
    }
    if (op.type === "deduplicate") {
      const indices = op.key.map((k) => headers.indexOf(k));
      const seen = new Set<string>();
      const keep = new Set<number>();
      const candidates = op.keep === "last" ? [...rows].reverse() : rows;
      for (const row of candidates) {
        const keys = indices.map((i) => row.cells[i]);
        // Any blank/whitespace-only key is incomplete, so preserve that row separately.
        if (keys.some((k) => k.trim() === "")) {
          keep.add(row.index);
          continue;
        }
        const key = JSON.stringify(keys);
        if (!seen.has(key)) {
          seen.add(key);
          keep.add(row.index);
        }
      }
      rows = rows.filter((r) => {
        if (!keep.has(r.index))
          excluded.push({
            row: r.index + 2,
            reason: `Duplicate ${op.key.join(" + ")} (keep ${op.keep})`,
          });
        return keep.has(r.index);
      });
      continue;
    }
    const index = headers.indexOf(op.column);
    rows = rows.map((row) => ({
      ...row,
      cells: row.cells.map((v, i) =>
        i !== index
          ? v
          : op.type === "trim"
            ? v.trim()
            : op.type === "lowercase"
              ? v.toLowerCase()
              : v.toUpperCase(),
      ),
    }));
  }
  const changes: Preview["changes"] = [];
  rows = rows.map((r) => ({
    ...r,
    cells: r.cells.map((value, i) => {
      const after = safe ? spreadsheetSafe(value) : value;
      const before = table.rows[r.index][i];
      if (before !== after)
        changes.push({
          row: r.index + 2,
          column: headers[i],
          before,
          after,
          reason:
            after !== value
              ? "Includes spreadsheet-safe escaping"
              : "Routine steps",
        });
      return after;
    }),
  }));
  const outputHeaders = safe ? headers.map(spreadsheetSafe) : headers;
  return {
    headers: outputHeaders,
    rows: rows.map((r) => r.cells),
    originalIndices: rows.map((r) => r.index),
    excluded: excluded.sort((a, b) => a.row - b.row),
    changes,
    escapedHeaders: headers.filter((h, i) => h !== outputHeaders[i]),
    csv: exportCsv(
      outputHeaders,
      rows.map((r) => r.cells),
      table.delimiter,
    ),
  };
}
