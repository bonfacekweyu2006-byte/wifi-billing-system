# Copilot instructions for WiFi Billing demo

This repository is a small, client-only WiFi billing demo. The app is a static HTML/CSS/JS SPA and stores all data in the browser `localStorage`.

Key points for an AI editing agent
- Architecture: single-page front-end app. UI lives in `index.html`, styles in `style.css`, logic in `app.js`.
- No build step: run by opening `WIFI WEBSITE INDEX.HTML` in a browser or serving the folder with a static server (e.g. `python -m http.server` or `npx serve`).
- Storage and data flow: persistent data lives under `localStorage` keys defined in `KEYS` at the top of `WIFI WEBSITE APP.JS` (e.g. `wifi_plans`, `wifi_customers`, `wifi_usage`, `wifi_invoices`, `wifi_profile`). `seedIfEmpty()` populates demo data on first run.
- Major flows: plans → customers → usage → invoices. Core functions to inspect when changing behaviour: `renderPlans`, `handlePlanForm`, `renderCustomers`, `handleCustomerForm`, `renderUsage`, `handleUsageForm`, `computeInvoice`, `renderInvoices`, `handleInvoiceForm`.

Project-specific conventions & gotchas
- This repository originally used filenames with spaces (e.g. `WIFI WEBSITE APP.JS`). Current canonical filenames are `index.html`, `style.css`, and `app.js`.
- Forms consistently use `new FormData(form)` + `Object.fromEntries()` to build payloads. Persisted arrays are read/written via the `store` helper (see `store.get`, `store.set`, `store.getObj`, `store.setObj`).
- UI IDs are authoritative. Examples: `plans-table`, `customers-table`, `usage-table`, `invoices-table`, `dashboard-invoices`, `customer-plan-select`, `invoice-customer-select`.

Editing guidelines (practical and specific)
- When changing data shapes, update `seedIfEmpty()` and the export/import logic in `initExportImport()` to preserve compatibility for existing JSON exports.
- Keep DOM ids stable — search-and-replace both JS and HTML when renaming. Example: `renderPlans()` writes to `plans-table` tbody, and also populates `customer-plan-select`.
- When modifying billing logic, prefer editing `computeInvoice(...)` (located in `WIFI WEBSITE APP.JS`). Tax, overage and total are computed there.
- For cross-cutting helpers (formatting, uid, store abstraction), modify the small helper block at the top of `WIFI WEBSITE APP.JS` to keep changes centralized.

Local development & debugging
- Serve or open the HTML directly. Example commands:
  - `python -m http.server 8000` then open `http://localhost:8000/WIFI WEBSITE INDEX.HTML`
  - `npx serve .`
- Inspect and manipulate data in console: `JSON.parse(localStorage.getItem('wifi_invoices')||'[]')`
- Reset state through Settings → `Reset all data` or clear each `KEYS` item from `localStorage`.

Examples from the codebase (quick references)
- Compute invoice: `computeInvoice(customer, plan, startDate, endDate)` — modifies `base`, `overageGb`, `overageCost`, `tax`, `total`.
- Export/import JSON schema: bundle contains `profile`, `plans`, `customers`, `usage`, `invoices` (see `initExportImport()`).
- Data keys: `KEYS` constant at top of `WIFI WEBSITE APP.JS`.

If you plan large changes
- Ask before renaming files or removing the duplicate `app.js` reference.
- Add compatibility code in `seedIfEmpty()` or migration helpers if changing persisted shapes.

If you'd like, I can:
- Consolidate and rename files to remove spaces and fix the duplicate script tag.
- Add a short README with run/test commands and the JSON export schema.

— End
