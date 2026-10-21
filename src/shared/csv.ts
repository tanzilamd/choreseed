import Papa from 'papaparse';
import { uniqueHeaders } from './recipe.js';
export const LIMITS = { bytes: 2 * 1024 * 1024, rows: 10000, columns: 50 };
export type Table = { headers: string[]; rows: string[][]; delimiter: ',' | ';' };
export function parseCsv(text: string, delimiter?: ',' | ';'): Table {
  if (new TextEncoder().encode(text).length > LIMITS.bytes) throw new Error('This file exceeds 2 MB. Split it into smaller CSV files.');
  text = text.replace(/^\uFEFF/, '');
  if (text.includes('\0') || text.includes('\uFFFD')) throw new Error('Use a valid UTF-8 CSV without null bytes.');
  const parsed = Papa.parse<string[]>(text, { delimiter: delimiter || '', delimitersToGuess: [',', ';'], skipEmptyLines: false, dynamicTyping: false });
  const serious = parsed.errors.filter(e => e.code !== 'UndetectableDelimiter');
  if (serious.length) throw new Error(`Malformed CSV: ${serious[0].message}`);
  const data = parsed.data;
  // One terminal line ending is a record terminator, not a separate empty row.
  if (/\r?\n$/.test(text) && data.at(-1)?.length === 1 && data.at(-1)?.[0] === '') data.pop();
  const headers = data.shift() || [];
  uniqueHeaders(headers);
  if (!headers.length || !text) throw new Error('The CSV needs a header row.');
  if (data.length > LIMITS.rows) throw new Error('This file exceeds 10,000 data rows.');
  data.forEach((r, i) => { if (r.length !== headers.length) throw new Error(`CSV row ${i + 2} has ${r.length} cells; expected ${headers.length}. Fix this row or override the delimiter.`); });
  return { headers, rows: data, delimiter: parsed.meta.delimiter === ';' ? ';' : ',' };
}
export function spreadsheetSafe(value: string): string {
  // Excel-compatible escaping also covers formulas after leading whitespace/control characters.
  return /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
}
export function exportCsv(headers: string[], rows: string[][], delimiter: ',' | ';') {
  return Papa.unparse([headers, ...rows], { delimiter, newline: '\r\n', quotes: true });
}
