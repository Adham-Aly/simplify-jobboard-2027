import type { ApplicationRecord } from "@/lib/applications/csv";
import type { Job } from "@/lib/readme/types";

export type StatusFilter = "all" | "not-applied" | "applied";
export type SortOrder = "readme" | "newest" | "company";
export type View = "board" | "applications";

export interface Filters {
  view: View;
  category: string; // "all" or a category id
  query: string;
  status: StatusFilter;
  maxAgeDays: number | null;
  sort: SortOrder;
  faangOnly: boolean;
  hideAdvancedDegree: boolean;
  hideNoSponsorship: boolean;
  hideCitizenship: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  view: "board",
  category: "all",
  query: "",
  status: "all",
  maxAgeDays: null,
  sort: "readme",
  faangOnly: false,
  hideAdvancedDegree: false,
  hideNoSponsorship: false,
  hideCitizenship: false,
};

export const AGE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Any time", value: null },
  { label: "Today", value: 0 },
  { label: "Past 3 days", value: 3 },
  { label: "Past week", value: 7 },
  { label: "Past 2 weeks", value: 14 },
  { label: "Past month", value: 30 },
];

const FLAG_KEYS = ["faangOnly", "hideAdvancedDegree", "hideNoSponsorship", "hideCitizenship"] as const;

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** Filters live in the URL so a page reload (which refetches the list) keeps your place. */
export function filtersFromParams(params: URLSearchParams): Filters {
  const age = params.get("age");
  const ageNumber = age === null ? null : Number(age);
  const filters: Filters = {
    view: oneOf(params.get("view"), ["board", "applications"], DEFAULT_FILTERS.view),
    category: params.get("category") || DEFAULT_FILTERS.category,
    query: params.get("q") ?? "",
    status: oneOf(params.get("status"), ["all", "not-applied", "applied"], DEFAULT_FILTERS.status),
    maxAgeDays: ageNumber !== null && Number.isFinite(ageNumber) ? ageNumber : null,
    sort: oneOf(params.get("sort"), ["readme", "newest", "company"], DEFAULT_FILTERS.sort),
    faangOnly: false,
    hideAdvancedDegree: false,
    hideNoSponsorship: false,
    hideCitizenship: false,
  };
  for (const key of FLAG_KEYS) filters[key] = params.get(key) === "1";
  return filters;
}

export function filtersToParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.view !== DEFAULT_FILTERS.view) params.set("view", filters.view);
  if (filters.category !== DEFAULT_FILTERS.category) params.set("category", filters.category);
  if (filters.query) params.set("q", filters.query);
  if (filters.status !== DEFAULT_FILTERS.status) params.set("status", filters.status);
  if (filters.maxAgeDays !== null) params.set("age", String(filters.maxAgeDays));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  for (const key of FLAG_KEYS) if (filters[key]) params.set(key, "1");
  return params;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

/** Space-separated terms must all appear somewhere in company, role, location or category. */
export function matchesQuery(haystack: string, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const text = normalize(haystack);
  return terms.every((t) => text.includes(t));
}

export function jobSearchText(job: Job): string {
  return [job.company, job.role, job.locations.join(" "), job.categoryTitle].join(" • ");
}

export function filterJobs(
  jobs: Job[],
  filters: Filters,
  applied: Map<string, ApplicationRecord>,
  query: string,
): Job[] {
  const result = jobs.filter((job) => {
    if (filters.category !== "all" && job.categoryId !== filters.category) return false;
    const isApplied = applied.has(job.id);
    if (filters.status === "applied" && !isApplied) return false;
    if (filters.status === "not-applied" && isApplied) return false;
    if (filters.maxAgeDays !== null && (job.ageDays === null || job.ageDays > filters.maxAgeDays)) {
      return false;
    }
    if (filters.faangOnly && !job.flags.faang) return false;
    if (filters.hideAdvancedDegree && job.flags.advancedDegree) return false;
    if (filters.hideNoSponsorship && job.flags.noSponsorship) return false;
    if (filters.hideCitizenship && job.flags.usCitizenship) return false;
    return matchesQuery(jobSearchText(job), query);
  });

  if (filters.sort === "newest") {
    // Stable sort keeps README order among postings of the same age.
    return result
      .map((job, i) => ({ job, i }))
      .sort((a, b) => (a.job.ageDays ?? Infinity) - (b.job.ageDays ?? Infinity) || a.i - b.i)
      .map(({ job }) => job);
  }
  if (filters.sort === "company") {
    return result
      .map((job, i) => ({ job, i }))
      .sort((a, b) => a.job.company.localeCompare(b.job.company) || a.i - b.i)
      .map(({ job }) => job);
  }
  return result;
}
