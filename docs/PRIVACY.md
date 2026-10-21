# Privacy and limitations

CSV rows and files remain in browser memory. Parsing and transformation run in a Web Worker; React renders values as text. Clearing a page loses unsaved file data. Raw CSVs are not written to IndexedDB, localStorage, the server ledger or service-worker caches.

On explicit compilation, column names, task instructions, clarification and selected reference excerpts are sent to Choreseed's backend and Backboard/OpenRouter. Column names can themselves contain sensitive information. Content manually included in instructions/notes is also transmitted. Review that content before consenting. Backboard/OpenRouter and their inference provider have their own retention policies; memory off and best-effort thread deletion are not zero-retention guarantees.

On explicit URL reading, Browserbase visits the selected public pages. Sessions disable CAPTCHA solving, recording and logging; request interception blocks other hosts, non-HTTPS and methods other than GET/HEAD. Login, private-account automation, form submission and access-control bypass are not supported. Blocked sources require pasted notes. Source excerpts are limited to 4,000 characters, with truncation visible and excerpts editable before compilation. All fetched content is untrusted data.

The server disables request-content logs. SQLite stores HMAC-hashed session/IP quota identifiers, timestamps, reservation amounts and outcomes. Anonymous cookies are HttpOnly and SameSite Strict, and Secure in production. The quota ledger persists on one disk through service restarts. Provider/hosting infrastructure may separately retain network metadata under its policies.

Recipes are saved to IndexedDB only by explicit save/import. They contain headers, operations, assumptions, source identifiers/labels/URLs and model identity; they do not contain CSV rows. Exported recipe JSON is portable and should be reviewed before sharing, since labels and header names may be sensitive. Delete removes the selected browser-local recipe. It does not revoke previously downloaded copies.

The service worker caches same-origin static app assets only. API and health responses are excluded. Offline replay requires a successful prior cache installation. Hosted AI generation is not available offline.

Limitations: contact CSV cleanup only, 2 MB / 10,000 rows / 50 unique nonblank columns. No XLSX/PDF, calculations, dates/currency, joins, fuzzy matching, arbitrary code, or private-account actions. Case operations use JavaScript Unicode casing, not locale-specific linguistic rules. Completely empty means every current cell equals the empty string; trim steps can make selected cells empty. Incomplete dedupe keys stay separate and retained rows preserve original order. Spreadsheet escaping is conservative and may prefix legitimate formula-like values, including negative numbers; the preview shows those changes and the toggle is explicit.

AI can misinterpret instructions. Schema validation constrains capabilities, not semantic correctness. Citations existing does not prove support. Review steps, assumptions, actual changed cells, excluded rows and the exported result. Keep your original file.
