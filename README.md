# simplify-jobboard-2027

A web app for working through the [SimplifyJobs Summer 2027 internship list](https://github.com/SimplifyJobs/Summer2027-Internships/blob/dev/README.md) and keeping track of where you applied and which version of your resume you used. It's deployed on Vercel and free for anyone to use. There's no account and no sign-up, and your data never leaves your computer.

## Using the app

Open the app in **Chrome, Edge, Arc, Brave or another Chromium-based browser**. It needs the File System Access API, which Safari and Firefox don't have.

1. **Pick your file.** The first time you visit, the app asks you to create a `job-applications.csv` or choose one you already have. Save it anywhere on your computer: Documents, a synced folder, wherever you like. That file is where all your application data lives.
2. **Name your resume.** Set a label under **Applying with** (top right), e.g. `SWE v3`. You can add as many labels as you like and switch between them whenever you want.
3. **Apply.** Each role's **Apply** and **Simplify** links open in a new tab. When you've applied, click **Mark applied**. That records the role, today's date and your current resume label in your CSV. The ▾ next to **Mark applied** lets you pick a different label for that one job.
4. **Come back any time.** The browser remembers which file you picked. If it asks for permission again, choose **"Allow on every visit"**. Roles you've applied to are highlighted, and **My applications** lists everything in your CSV, including roles that have since come off the list.

On a role you've applied to, click its resume chip to change the label, or click × to remove the record. A toast offers **Undo**. Your category, search and filters are kept in the URL, so a reload keeps your place. Press `/` to jump to search.

### Where your data goes

- **The job list is never stored.** Every page load, your browser fetches the latest list straight from GitHub. It asks for the newest commit on the repo's `dev` branch and reads the README at that commit, which avoids GitHub's 5-minute cache. The app's server only delivers the page itself; it never sees the list or anything you do with it.
- **Your applications live only in the CSV you chose**, on your own machine. Nothing is uploaded, and there is no database. The only other things kept are inside your browser's storage for this site: the pointer to the file you picked and your default resume label. If you clear the site's data, the app simply asks for the file again; the file itself is untouched.
- **The list is shown in full.** Every table in the README is read, and every cell's text and every link is kept: company pages, Apply and Simplify links, multi-location lists, the 🔥/🎓/🛂/🇺🇸 markers and ages. The footer checks the number of roles shown against the counts the README states.

### The CSV file

It's a normal CSV, so you can open it in Excel, Numbers or Google Sheets. The app re-reads it whenever you switch back to the tab, re-reads it before every save, and keeps any columns you add yourself (a `notes` column, say). It won't overwrite a CSV that isn't an applications file.

| column | example |
| --- | --- |
| `job_id` | `simplify:258d5748-3766-4b86-b1f1-7672e1c66cef` (Simplify posting id, used to match rows to the live list) |
| `company`, `role`, `location`, `category` | a snapshot of the posting when you applied |
| `resume_version` | your label, e.g. `SWE v3` |
| `applied_at` | `2026-10-07T11:42:05-04:00` |
| `apply_url`, `simplify_url`, `company_url` | links, so the record still makes sense after the posting leaves the list |

## Development

```sh
npm install
npm run dev          # http://localhost:2027 — stop with Ctrl+C
npm test             # unit tests (README parser, CSV, filters)
npx playwright test  # end-to-end tests in Chromium (starts the dev server if one isn't running)
npm run lint
npm run typecheck
npm run build        # production build, as Vercel runs it
```

Use the same address every time (`localhost:2027`). Browsers remember the chosen file per address, so `127.0.0.1:2027` and the deployed site each ask for it separately.

### Deployment

The app is a single static page built with Next.js, and everything it does happens in the browser, so it deploys to Vercel with the default Next.js settings. There are no environment variables, server functions or databases. Because GitHub is fetched from each visitor's browser, the GitHub API's unauthenticated limit of 60 requests per hour applies per visitor, not to the deployment. If a visitor exceeds it, the app falls back to the branch URL, which can be up to 5 minutes stale.
