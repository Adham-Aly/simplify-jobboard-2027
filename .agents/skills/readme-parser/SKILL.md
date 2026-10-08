---
name: readme-parser
description: How the SimplifyJobs README is fetched and turned into the board — section/table discovery, the sanitized CellNode tree, derived Job fields, job ids (the CSV join key), "↳" continuation rows, flags, the advertised-count check, and how cells render (CellContent, JobTable). Load before touching src/lib/readme/, CellContent.tsx, JobTable.tsx's column handling, or anything that depends on a job's id or fields.
---

# From README.md to `Board`

`fetch.ts` (`loadBoard`) → `parse.ts` (`parseReadme`) → `types.ts` (`Board`, `Category`, `Job`,
`CellNode`). `use-board.ts` runs it on mount and on the refresh button. Unit tests with an inline
fixture covering every shape below: `parse.test.ts`. When the real README grows a new shape, add it
to that fixture first.

## What the source looks like (and what the parser relies on)

- Markdown with **raw HTML tables**. Category sections are `## <emoji> <Title> Internship Roles`
  headings, sometimes indented by two spaces (`/^\s{0,3}##\s+/`). Any `##` section containing a
  `<table>` becomes a category; Legend, FAQs and contributors have none and are skipped.
- **A section can hold more than one table.** GitHub's preview cuts off around 500 KB, so the README
  splits Data Science with a `github-cutoff-warning` block (itself an `<h2>`, inside a `<div>`, so not
  a markdown heading). All tables in a section are merged in order into one category.
- Columns today: Company · Role · Location · Application · Age. They are read from each table's
  `<th>`s, never hard-coded; a category's `columns` is the union in first-seen order, and the board's
  is the union across categories. An unknown new column still renders.
- **Company `↳`** means "same company as the row above". `previousCompany` carries across tables of
  the same section; the parser fills `company`/`companyUrl` from it and sets `isContinuation`.
  `JobTable` renders such rows as `↳ <muted name>` so filtered/sorted views stay readable.
- Location: plain text with `<br>`, or `<details><summary><strong>N locations</strong></summary>a<br>b…`.
- Application: `<div align="center">` with image-only links — `alt="Apply"` (two different images)
  and `alt="Simplify"`. One row has Apply only. Rendered as buttons labelled by their alt text.
- Markers are emoji inside cell text: 🔥 (company), 🎓 🛂 🇺🇸 🔒 (role/row). `flags` is derived from
  the row's text; the emoji stay in the rendered text too.
- Advertised counts: `### Browse 1867 Internship Roles by Category` and lines like
  `💻 **[Software Engineering](…)** (622)`. Matched to categories by title. The footer compares.

## The CellNode tree — fidelity and safety in one place

`convertNode` maps the cell's DOM to `text | link | image | break | details | format`. Rules:
links keep only `http:`/`https:`/`mailto:` (relative ones resolve against the README's GitHub URL);
an unsafe link becomes its children, so its **text survives without the href**; unknown tags become
`format: span`/`div` with their children — **never dropped**. `script`/`style`/`template` are the only
things discarded. `CellContent` renders the tree with React elements; there is no HTML string sink.

Before shipping a parser change, check fidelity against the live file (the unit fixture can't): every
`href` inside a `<td>` of the raw markdown must appear in `board.jobs.flatMap(j => j.links)` — when this
was written: 4,999 of 4,999 — and per-category job counts must equal the advertised counts.

## Job ids are the CSV's join key — changing them orphans users' data

`job_id` in every visitor's `job-applications.csv` is the id derived here:
`simplify:<uuid>` from the `simplify.jobs/p/<uuid>` link; else `url:<apply url>` with `utm_*`, `ref` and
the hash stripped; else `row:<category>|<company>|<role>|<locations>`. A posting listed twice gets
`#2`, `#3`… in README order. **Any change to this derivation is a data migration** for every existing
CSV out there: avoid it; if unavoidable, keep matching the old form too.

## Derived fields are for search, filters and the CSV — not for display

`company`, `role`, `locations`, `applyUrl`, `simplifyUrl`, `links`, `age`/`ageDays` (`0d`, `2w`, `1mo`
→ 30, `1y`) exist so filters, sorting and `recordFromJob` don't re-walk trees. The board renders the
**cells**. Column *kinds* are recognised by header name in **two places — change both**:
`parse.ts` `buildJob` (`findColumn` regexes) and `JobTable.tsx` `columnKind`.

## Fetching

`cache: "no-store"` on both requests, from the browser. The SHA comes from
`api.github.com/repos/…/commits/dev` with `Accept: application/vnd.github.sha` (40 hex chars back,
CORS `*`); on any failure (rate limit, network) it falls back to the `dev` branch raw URL, which can
be ~5 min stale — query strings do not bust that CDN (measured: `x-cache: HIT` with three different
`?t=` values). `LoadedBoard` records `commitSha`, `sourceUrl` and `fetchedAt` for the header and footer.
