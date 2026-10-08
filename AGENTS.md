# AGENTS.md

Guidance for AI coding agents working in this repository.

## Maintaining this file

Keep it current — fixing what is outdated, wrong or missing here is part of your change, not extra
credit — and keep it **at or under 150 lines**.

⚠️ **Maintenance here is ZERO-SUM.** The budget is the point: a file nobody finishes reading guides
nothing. So the test is never "is this true and useful" (almost everything is) but:

> **Is this worth removing something else to make room for?**

If no, it does not go here. If yes, name what you cut and cut it in the same change — though while the
file is *under* 150 that room already exists, so add freely: spare budget is there to be spent, and a
file that uses it well beats one that leaves it on the table. Where it goes instead:

1. **Has a detectable trigger** ("when touching the README parser", "when writing to the CSV") → a
   **skill**, loaded only when needed and costing nothing otherwise. This is the default answer.
2. **Broad and unconditional** — every change must respect it, whatever it touches → this file.
3. **Neither** → bloat: delete it, or leave it as a comment beside the code, where a narrow fact stays
   honest longest. A fact with no trigger is not a skill either — never invent one to hold it.

Skills live in `.agents/skills/<name>/SKILL.md` (`.claude/skills` is a symlink to that folder).

## What this is

**simplify-jobboard-2027** — a public web app, **deployed on Vercel**, over the SimplifyJobs Summer 2027
internship list (`SimplifyJobs/Summer2027-Internships`, `README.md` on the `dev` branch). Anyone can use
it: each visitor picks a `job-applications.csv` on **their own machine**, and the app tracks there which
roles they applied to, when, and with which resume label. No backend, no database, no accounts. It reads
and writes that file through the **File System Access API**, so it is **Chromium-only by design**.
Stack: **Next.js 16 (App Router, Turbopack, `cacheComponents`) + React 19 + TS 5 + Tailwind v4** (via
`@tailwindcss/postcss`), papaparse, idb-keyval, lucide-react. Vitest for units, Playwright for E2E.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands

```bash
npm run dev          # next dev on http://localhost:2027 (fixed port: the file grant is per origin)
npm test             # vitest — README parser, CSV, filters (jsdom)
npx playwright test  # E2E in Chromium; starts the dev server if none is running, stops it after
npm run lint         # eslint (flat config)
npm run typecheck    # tsc --noEmit
npm run build        # what Vercel runs; the page must stay "○ (Static)"
```

**The dev server belongs to the user.** They start and stop it themselves. Never leave one running
that you started: Playwright's `webServer` cleans up after itself; a server you launch by hand, you
kill before you finish. A change is verified by the E2E suite or a Playwright script against the
running app — see the `verify-in-browser` skill before claiming anything works.

## Architecture: what every change must respect

- **Job data is never persisted — anywhere.** The user's core requirement. `useBoard` fetches on every
  page load, in the **browser**, with `cache: "no-store"`: first the `dev` commit SHA from the GitHub
  API, then `raw.githubusercontent.com/…/<sha>/README.md` (the branch URL is CDN-cached ~5 min and query
  strings don't bust it). No `localStorage`, Cache API, service worker, `"use cache"`, route handler,
  server fetch or build-time import of the list. Keeping it client-side also puts the GitHub API's
  60 req/h unauthenticated limit on each visitor's IP, not on the Vercel deployment.
- **The user's CSV is the only file the app ever touches.** IndexedDB (`simplify-jobboard-2027` /
  `settings`) holds exactly two keys: the file handle and the default resume label. **A new key, or any
  new place data is kept, needs the user's OK.** Every read/write goes through
  `src/lib/applications/` — see the `applications-csv` skill before changing it.
- **Nothing in the README is omitted.** Cells are kept as a sanitized `CellNode` tree and rendered whole
  by `CellContent`; the structured fields on `Job` (company, locations, applyUrl, flags…) are *derived*,
  for search, filters and the CSV — never a substitute for rendering the cell. The footer compares parsed
  counts to the README's own. Load the `readme-parser` skill before touching `src/lib/readme/`.
- **README HTML never reaches `innerHTML`.** `parse.ts` converts the DOM to an allowlisted tree (http(s)/
  mailto links only, unknown tags flattened, never dropped). This origin holds a write grant to a file on
  the user's disk: keep `dangerouslySetInnerHTML` out of the codebase.
- **Every link opens in a new tab** — `target="_blank" rel="noopener noreferrer"`. The app is a list of
  links the user clicks through; navigating away loses their place.
- **Visitors are anyone, on any Chromium.** No user-specific paths, labels or defaults may be baked in;
  every user-facing string must make sense to a stranger. Unsupported browsers get a read-only board.
- **The page is a static shell; everything happens in client components.** `page.tsx` wraps
  `JobBoardApp` in `<Suspense>` because filters are read with `useSearchParams` (required for the
  prerender under `cacheComponents`). Adding server-side data work changes the privacy story above.
- **Filters are React state mirrored to the URL** (`useFilters` → `history.replaceState`), seeded once.
  Driving inputs off the URL directly drops keystrokes (measured: typing fast kept only the last char).
- **~2,000 rows stay cheap:** `JobRow` is `memo`'d, so every prop must be stable — `useTrackerActions`
  returns ref-backed callbacks that never change identity; `JobTable` renders 150 rows, then 400 more per
  sentinel hit. An inline arrow or a fresh object passed to a row re-renders all of them.
- **Light theme only.** Colours are Tailwind `@theme` tokens in `globals.css` (`paper`, `ink`, `accent`,
  `done`…); use them, not raw hex. Global element styles go in `@layer base` — unlayered CSS beats every
  utility (that is how the double focus ring happened).

## Conventions & gotchas

- **Tailwind is wired through PostCSS, not the `@tailwindcss/turbopack` loader** create-next-app
  scaffolds: with the loader, edits to `globals.css` never hot-reloaded (measured: 0 of 2 edits picked
  up; PostCSS: 2 of 2). Don't switch back.
- **`next.config.ts` sets `devIndicators: false`** — the floating badge covered the table.
- **Floating UI is the app's own**: one `ResumeMenu` (fixed-position, flips above near the bottom,
  closes on scroll/resize/outside press) and one `ToastProvider`. Reuse them; never `alert`/`confirm`/
  `prompt` — they block the page and the E2E harness alike.
- **`react-hooks` lint is strict** (refs during render, set-state in effects). Update refs in
  `useLayoutEffect`/`useEffect`, measure DOM through callback refs (an element that mounts after the
  first render — the board behind the file gate — is never seen by a `[]` effect).
- **Match the house comment style.** Explain *why*, beside the code, with the evidence that forced it;
  a comment restating what the line does is not it.
- **The README is user documentation** for visitors of the deployed app. A user-facing change is not
  finished until the README describes it.
