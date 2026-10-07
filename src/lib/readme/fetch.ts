import { parseReadme } from "./parse";
import type { Board } from "./types";

const OWNER = "SimplifyJobs";
const REPO = "Summer2027-Internships";
const BRANCH = "dev";
const FILE = "README.md";

export const README_PAGE_URL = `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${FILE}`;

export interface LoadedBoard extends Board {
  /** The commit the README was read at, when it could be resolved. */
  commitSha: string | null;
  /** GitHub page for the exact revision that was loaded. */
  sourceUrl: string;
  fetchedAt: Date;
}

/**
 * raw.githubusercontent.com caches branch URLs for up to 5 minutes, so first
 * resolve the branch's latest commit and read the README pinned to it.
 * The GitHub API allows 60 unauthenticated requests per hour; if that is
 * exhausted, fall back to the branch URL.
 */
async function resolveLatestCommit(signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/commits/${BRANCH}`,
      {
        headers: { Accept: "application/vnd.github.sha" },
        cache: "no-store",
        signal,
      },
    );
    if (!res.ok) return null;
    const sha = (await res.text()).trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

export async function loadBoard(signal?: AbortSignal): Promise<LoadedBoard> {
  const commitSha = await resolveLatestCommit(signal);
  const ref = commitSha ?? BRANCH;
  const res = await fetch(
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${FILE}`,
    { cache: "no-store", signal },
  );
  if (!res.ok) {
    throw new Error(`GitHub responded with ${res.status} ${res.statusText}`.trim());
  }
  const markdown = await res.text();
  const board = parseReadme(markdown);
  if (board.jobs.length === 0) {
    throw new Error("The README was fetched, but no job tables were found in it.");
  }
  return {
    ...board,
    commitSha,
    sourceUrl: `https://github.com/${OWNER}/${REPO}/blob/${ref}/${FILE}`,
    fetchedAt: new Date(),
  };
}
