import { parseCsv } from "../src/shared/csv.js";
import { execute } from "../src/shared/engine.js";
self.onmessage = async (event: MessageEvent) => {
  const { id, file, text, delimiter, table, recipe, safe } = event.data;
  try {
    const result = table
      ? execute(table, recipe, safe)
      : parseCsv(
          file
            ? new TextDecoder("utf-8", { fatal: true }).decode(
                await (file as File).arrayBuffer(),
              )
            : text,
          delimiter,
        );
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "Use a UTF-8 CSV file.",
    });
  }
};
