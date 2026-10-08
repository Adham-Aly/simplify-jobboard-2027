---
name: verify-in-browser
description: How to actually verify a change in this repo — the Playwright E2E suite (e2e/) and ad-hoc Playwright scripts driving the running app in Chromium against an OPFS-stubbed job-applications.csv, plus screenshot review. Load before writing or changing an E2E test, before driving the app in a browser, and before claiming a change works.
---

# Verifying a change

`npm run typecheck`, `npm run lint` and `npm test` (vitest: parser, CSV, filters) are the static and
unit gates. Anything behavioural — fetching, rendering, the file flow, reloads — is verified by
Playwright driving the running app in Chromium. A change is not verified because it typechecks.

```bash
npx playwright test                    # the suite: e2e/jobboard.spec.ts
npx playwright test -g "survives"      # one test
```

`playwright.config.ts` points at `http://localhost:2027` with `reuseExistingServer: true`: if the
user's dev server is up it is reused (and left alone); otherwise Playwright starts `npm run dev` and
**stops it when the run ends**. That is the only acceptable way to have a server you started — the
user starts and stops their own. If you launch one by hand, kill it before you finish and check
`lsof -nP -iTCP:2027 -sTCP:LISTEN` is empty.

## The harness (`e2e/fixtures.ts`) — and why each piece exists

1. **The native file pickers are replaced**, in an `addInitScript`, by functions returning
   `navigator.storage.getDirectory()` → `getFileHandle("job-applications.csv", { create: true })`.
   The native picker cannot be driven. Everything after it — `queryPermission`, `getFile`,
   `createWritable`, the IndexedDB round-trip — is the real API. OPFS handles report `granted`, so no
   permission shim is needed. `readCsv(page)` / `writeCsv(page, text)` read and write that same file
   from outside the app's code path, to assert on it or to simulate a hand edit in a spreadsheet.

2. **Every test gets a persistent (non-incognito) profile** via `chromium.launchPersistentContext`
   (`channel: "chromium"`, profile in `testInfo.outputPath`). Playwright's default contexts are
   incognito-style, and in them **reading a stored file handle back out of IndexedDB closes the page**
   with no error (measured on Playwright 1.63 / bundled Chromium: both `chromium-headless-shell` and
   `channel: "chromium"` die on the first reload that restores the handle; the same steps in a
   persistent profile return `granted` and read the file). Any test that reloads with a file connected
   needs this — never "fix" the crash in app code.

3. **Turn tracing off** (the config uses `screenshot: "only-on-failure"`). With
   `trace: "retain-on-failure"` a failing test reported `Object with guid response@… was not bound in
   the connection` instead of its real assertion — the 1.1 MB README response trips the tracer.

4. **The README is live data.** Never assert on a specific company, role or count: they change
   hourly. Assert on structure (first row has an `Apply` link with `target="_blank"`), on the footer's
   own verdict (`All N roles from the README are shown`), or on data the test wrote itself.

5. **Wait on the UI, not on time**: `expect(locator).toBeVisible()` for rows, the `Applied …` text and
   toasts. The first load is two GitHub requests (SHA, then README); budget for it, don't sleep.

6. **Selectors that hold up**: rows are `tbody tr` with `data-job-id`; the mark-applied button is
   `getByRole("button", { name: "Mark applied", exact: true })` (the ▾ beside it is
   `/specific resume/`); the resume menu is `getByRole("dialog")` with one textbox, submitted by Enter;
   views are `getByRole("tab", { name: /My applications/ })`; category tabs are buttons with
   `aria-current="page"` when active.

7. **Simulating "the user edited the CSV elsewhere"**: `writeCsv`, then
   `window.dispatchEvent(new Event("focus"))` — the app re-reads on focus and visibility change.

## Checking the privacy guarantees

When a change touches fetching or storage, prove the guarantees rather than reason about them:
attach a CDP session (`context.newCDPSession(page)`, `Network.enable`) and log
`Network.responseReceived` for GitHub URLs across several `page.reload()`s — each load must show
both requests with `fromDiskCache=false`. Then dump `localStorage`, `sessionStorage`, `caches.keys()`,
service-worker registrations and every IndexedDB store (only the handle + default label may exist),
and `grep -rla` the persistent profile directory and `.next/` for a company name taken from the
rendered list — expect no hits.

## Look at it

Take full-viewport screenshots (`page.screenshot`, 1440×900 and ~1180 wide) of the states you
touched — board, an applied row, the open resume menu, My applications, a toast, the first-run gate —
and read them. Two bugs this suite missed were obvious on screen: Apply/Simplify wrapping onto two
lines, and a column header that wasn't sticky. Per the repo owner's standing instruction, be picky:
anything visibly off gets fixed, whether or not it is what you were sent to do.

The Chrome extension (`mcp__claude-in-chrome__*`) drives the user's real browser when connected;
it often isn't — Playwright is the dependable path.
