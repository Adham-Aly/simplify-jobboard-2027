---
name: applications-csv
description: The visitor's job-applications.csv and everything around it — the File System Access flow (pickers, stored handle, permission states, the gate), the CSV schema and its round-trip rules, the serialized re-read-before-write mutation queue, resume labels and the default label, and the two IndexedDB keys. Load before changing src/lib/applications/, ConnectGate, ApplicationControl/ApplicationsView/useTrackerActions, the CSV columns, or before storing anything new anywhere.
---

# The applications file: the visitor's data, on the visitor's disk

Three modules: `file-system.ts` (the only code that calls pickers, handles or IndexedDB),
`csv.ts` (pure schema + parse/serialize, unit-tested in `csv.test.ts`) and `use-applications.ts`
(the hook: connection state machine + mutations). Components never touch a handle.

## The schema is a public file format

Every visitor's CSV, possibly years old and hand-edited in a spreadsheet, must keep loading.

- Columns, in write order: `job_id, company, role, location, category, resume_version, applied_at,
  apply_url, simplify_url, company_url`. Only **`job_id` is required to recognise the file**; missing
  known columns read as `""`. Renaming or removing a column breaks existing files: add, never rename.
- **Unknown columns are the user's** (`notes`, `status`…): kept in `extraColumns`/`record.extra` and
  written back after the known ones, values untouched. Rows with an empty `job_id` are kept too.
- A non-empty file without a `job_id` header throws `NotAnApplicationsFileError` and the gate offers
  another file — the app must never overwrite a CSV it doesn't own. An empty file gets the header.
- `applied_at` is local ISO 8601 with offset (`localIsoTimestamp`). A leading BOM (Excel) is stripped;
  output is `\n`-separated with exactly one trailing newline, quoted by papaparse.
- `location` is the job's locations joined with `"; "`; `ApplicationsView` splits on it.
- `job_id` is the README parser's id — see the `readme-parser` skill before touching either side.

## Writes: re-read, change, write — one at a time

`mutate(change)` chains onto a promise queue; each run **re-reads the file**, applies `change` to the
fresh records, writes the whole file with `createWritable`, then sets state. So edits made in a
spreadsheet between two clicks survive, and two fast clicks can't interleave. Never write from cached
React state, and never write around `mutate`. The file is also re-read (not written) on window
`focus` and `visibilitychange`. Re-marking an applied job changes its label but keeps `applied_at`.

## Connection states (`Connection`) and the gate

`checking` → `unsupported` (no `showSaveFilePicker`: a read-only board is offered) | `disconnected`
(no stored handle: first visit, the welcome card) | `needs-permission` (stored handle, grant lapsed —
`requestPermission` **needs a user gesture**, hence the "Continue with …" button) | `connected` |
`error` (read/write failed: moved, deleted, locked, or not an applications file — with retry and
choose-another). Any failed mutation drops to `error`; the board is gated until it's resolved.
"Switch file" (`disconnect`) forgets the stored handle only — it never deletes or edits the file.

The grant and the stored handle are **per origin**: localhost:2027, 127.0.0.1:2027 and the Vercel
domain are three separate setups. That is why the dev port is fixed.

## What the browser keeps — and the rule for anything more

IndexedDB database `simplify-jobboard-2027`, store `settings`, exactly two keys:
`applications-file-handle` (the `FileSystemFileHandle`) and `default-resume-label` (a string).
No `localStorage`, no job data, no copies of the CSV. **Storing anything new — a key, a cache, a
preference — needs the repo owner's explicit OK**; the privacy story in the README depends on it.

## Resume labels

There is no label list of its own: `resumeLabels` = the default label ∪ every `resume_version` in the
CSV, sorted naturally. A label exists once it is used or set as default. The first "Mark applied"
with no default opens `ResumeMenu` and makes the chosen label the default. Per-job overrides go
through the ▾ split button or the resume chip; `useTrackerActions` owns these flows and the
Undo toasts (remove → `restoreApplication`, which won't duplicate an id already present).
