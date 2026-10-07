# simplify-jobboard-2027

A local web app for working through the [SimplifyJobs Summer 2027 internship list](https://github.com/SimplifyJobs/Summer2027-Internships/blob/dev/README.md) and keeping track of where you applied and which version of your resume you used.

## Running it

```sh
npm install
npm run dev
```

Then open **http://localhost:2027** in Chrome, Edge, Arc or another Chromium-based browser. The app needs the File System Access API, which only Chromium browsers have.

The first time you open the app, it asks you to create (or pick) a `job-applications.csv`. After that it remembers the file. If the browser asks again, choose "Allow on every visit".

Keep using the same address (port 2027). Browsers remember the chosen file per address, so `localhost:2027` and `127.0.0.1:2027` each ask for it separately.

## How it works

**The job list is never stored.** Each page load asks GitHub for the latest commit on the repo's `dev` branch, then fetches `README.md` at that exact commit. Going through the commit gets around raw.githubusercontent.com's 5-minute cache. Every table in the README is parsed, and every cell's text and every link is kept: company pages, Apply links, Simplify links, multi-location lists, 🔥/🎓/🛂/🇺🇸 markers and ages. The footer checks the parsed counts against the counts the README states for each category.

**Your applications live in one CSV file you choose.** It's the only file the app reads or writes. Each row is one application:

| column | example |
| --- | --- |
| `job_id` | `simplify:258d5748-3766-4b86-b1f1-7672e1c66cef` (Simplify posting id, used to match rows to the live list) |
| `company`, `role`, `location`, `category` | a snapshot of the posting when you applied |
| `resume_version` | your label, e.g. `SWE v3` |
| `applied_at` | `2026-10-07T11:42:05-04:00` |
| `apply_url`, `simplify_url`, `company_url` | links, so the record still makes sense after the posting leaves the list |

You can open and edit the file in a spreadsheet. The app re-reads it whenever you switch back to the tab, re-reads it before every write, and keeps any extra columns you add (a `notes` column, for example).

Besides the CSV, the browser itself stores two small settings for this site (in IndexedDB): the pointer to the file you picked and your default resume label. No job data is stored there.

### Using it

- **Applying with** (top right) sets your default resume label. **Mark applied** on a row tags that role with it. The ▾ next to **Mark applied** lets you pick a different label for that one job.
- On a role you've applied to, click its resume chip to change the label, or click × to remove the record. A toast offers **Undo**.
- **My applications** lists everything in the CSV and shows whether each role is still on the list.
- Your current category, search and filters are kept in the URL, so reloading (which refetches the list) keeps your place. Press `/` to jump to search.

## Development

```sh
npm test            # unit tests (README parser, CSV, filters)
npx playwright test # end-to-end tests in Chromium (starts the dev server if needed)
npm run lint
npm run typecheck
```

The end-to-end tests replace the native file pickers with a file in the browser's private storage (OPFS). Everything after the picker runs the real code: permissions, reads and writes.
