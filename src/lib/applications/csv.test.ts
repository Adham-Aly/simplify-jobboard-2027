import { describe, expect, it } from "vitest";
import {
  type ApplicationRecord,
  localIsoTimestamp,
  NotAnApplicationsFileError,
  parseApplicationsCsv,
  serializeApplicationsCsv,
} from "./csv";

const record: ApplicationRecord = {
  jobId: "simplify:aaaa",
  company: "S&C Electric, Inc.",
  role: 'Software "Platform" Intern',
  location: "Chicago, IL; NYC",
  category: "Software Engineering",
  resumeVersion: "SWE v3",
  appliedAt: "2026-10-07T11:42:05-04:00",
  applyUrl: "https://example.com/apply?a=1&b=2",
  simplifyUrl: "https://simplify.jobs/p/aaaa",
  companyUrl: "",
  extra: {},
};

describe("applications CSV", () => {
  it("treats an empty file as no applications", () => {
    expect(parseApplicationsCsv("")).toEqual({ records: [], extraColumns: [] });
    expect(parseApplicationsCsv("\n  \n")).toEqual({ records: [], extraColumns: [] });
  });

  it("writes a header even with no records", () => {
    expect(serializeApplicationsCsv({ records: [], extraColumns: [] })).toBe(
      "job_id,company,role,location,category,resume_version,applied_at,apply_url,simplify_url,company_url\n",
    );
  });

  it("round-trips values that need quoting", () => {
    const text = serializeApplicationsCsv({ records: [record], extraColumns: [] });
    expect(parseApplicationsCsv(text).records).toEqual([record]);
  });

  it("preserves columns added by hand, and a byte-order mark", () => {
    const text =
      "﻿job_id,company,notes,resume_version\r\nsimplify:aaaa,Acme,\"called back, 2nd round\",v1\r\n";
    const parsed = parseApplicationsCsv(text);
    expect(parsed.extraColumns).toEqual(["notes"]);
    expect(parsed.records[0]).toMatchObject({ jobId: "simplify:aaaa", company: "Acme", resumeVersion: "v1", role: "" });
    const again = parseApplicationsCsv(serializeApplicationsCsv(parsed));
    expect(again.records[0].extra).toEqual({ notes: "called back, 2nd round" });
  });

  it("refuses files that aren't an applications CSV", () => {
    expect(() => parseApplicationsCsv("name,email\nAda,ada@example.com\n")).toThrow(NotAnApplicationsFileError);
  });

  it("formats timestamps with the local offset", () => {
    const stamp = localIsoTimestamp(new Date(2026, 9, 7, 9, 5, 3));
    expect(stamp).toMatch(/^2026-10-07T09:05:03[+-]\d{2}:\d{2}$/);
    expect(new Date(stamp).getTime()).toBe(new Date(2026, 9, 7, 9, 5, 3).getTime());
  });
});
