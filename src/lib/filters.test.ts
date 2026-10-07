import { describe, expect, it } from "vitest";
import type { ApplicationRecord } from "./applications/csv";
import { DEFAULT_FILTERS, filterJobs, filtersFromParams, filtersToParams, matchesQuery } from "./filters";
import type { Job } from "./readme/types";

function job(id: string, overrides: Partial<Job> = {}): Job {
  return {
    id,
    categoryId: "swe",
    categoryTitle: "Software Engineering",
    position: 0,
    cells: {},
    company: "Acme",
    companyUrl: null,
    isContinuation: false,
    role: "Intern",
    locations: ["NYC"],
    applyUrl: null,
    simplifyUrl: null,
    links: [],
    age: "1d",
    ageDays: 1,
    flags: { faang: false, advancedDegree: false, noSponsorship: false, usCitizenship: false, closed: false },
    ...overrides,
  };
}

describe("filters", () => {
  it("round-trips through the URL and omits defaults", () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe("");
    const filters = { ...DEFAULT_FILTERS, category: "swe", query: "data eng", maxAgeDays: 7, hideAdvancedDegree: true };
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
  });

  it("ignores junk in the URL", () => {
    expect(filtersFromParams(new URLSearchParams("status=nope&sort=1&age=abc"))).toEqual(DEFAULT_FILTERS);
  });

  it("matches every search term, ignoring case and accents", () => {
    expect(matchesQuery("Société Générale • Quant Intern • Paris", "societe QUANT")).toBe(true);
    expect(matchesQuery("Acme • Quant Intern", "quant london")).toBe(false);
  });

  it("filters by status, age and flags, and sorts stably", () => {
    const jobs = [
      job("a", { ageDays: 10, company: "Zeta" }),
      job("b", { ageDays: 2, flags: { ...job("x").flags, advancedDegree: true } }),
      job("c", { ageDays: 2, company: "Beta" }),
      job("d", { ageDays: null, categoryId: "hw" }),
    ];
    const applied = new Map([["c", {} as ApplicationRecord]]);
    const ids = (f: Partial<typeof DEFAULT_FILTERS>) =>
      filterJobs(jobs, { ...DEFAULT_FILTERS, ...f }, applied, f.query ?? "").map((j) => j.id);

    expect(ids({ status: "applied" })).toEqual(["c"]);
    expect(ids({ status: "not-applied" })).toEqual(["a", "b", "d"]);
    expect(ids({ maxAgeDays: 7 })).toEqual(["b", "c"]);
    expect(ids({ hideAdvancedDegree: true })).toEqual(["a", "c", "d"]);
    expect(ids({ category: "hw" })).toEqual(["d"]);
    expect(ids({ sort: "newest" })).toEqual(["b", "c", "a", "d"]);
    expect(ids({ sort: "company" })).toEqual(["b", "d", "c", "a"]);
  });
});
