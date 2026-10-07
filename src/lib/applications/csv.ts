import Papa from "papaparse";

/**
 * Columns of job-applications.csv, in the order they are written.
 * Columns a user adds by hand (e.g. "notes") are preserved on every write.
 */
export const CSV_COLUMNS = [
  "job_id",
  "company",
  "role",
  "location",
  "category",
  "resume_version",
  "applied_at",
  "apply_url",
  "simplify_url",
  "company_url",
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

export interface ApplicationRecord {
  jobId: string;
  company: string;
  role: string;
  location: string;
  category: string;
  resumeVersion: string;
  /** ISO 8601 timestamp with the local UTC offset. */
  appliedAt: string;
  applyUrl: string;
  simplifyUrl: string;
  companyUrl: string;
  /** Values of columns this app does not know about, keyed by header. */
  extra: Record<string, string>;
}

export interface ApplicationsFile {
  records: ApplicationRecord[];
  /** Unknown columns found in the file, in their original order. */
  extraColumns: string[];
}

export class NotAnApplicationsFileError extends Error {
  constructor() {
    super(
      'This file has content but no "job_id" column, so it doesn\'t look like a job-applications.csv. ' +
        "Choose a different file (or an empty one) to keep it safe from being overwritten.",
    );
    this.name = "NotAnApplicationsFileError";
  }
}

const FIELD_FOR_COLUMN: Record<CsvColumn, Exclude<keyof ApplicationRecord, "extra">> = {
  job_id: "jobId",
  company: "company",
  role: "role",
  location: "location",
  category: "category",
  resume_version: "resumeVersion",
  applied_at: "appliedAt",
  apply_url: "applyUrl",
  simplify_url: "simplifyUrl",
  company_url: "companyUrl",
};

const KNOWN = new Set<string>(CSV_COLUMNS);

export function parseApplicationsCsv(text: string): ApplicationsFile {
  const content = text.replace(/^﻿/, "");
  if (content.trim() === "") return { records: [], extraColumns: [] };

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  if (!headers.includes("job_id")) throw new NotAnApplicationsFileError();

  const extraColumns = headers.filter((h) => h && !KNOWN.has(h) && h !== "__parsed_extra");
  const records = result.data.map((row) => {
    const record = { extra: {} } as ApplicationRecord;
    for (const column of CSV_COLUMNS) {
      record[FIELD_FOR_COLUMN[column]] = (row[column] ?? "").trim();
    }
    for (const column of extraColumns) record.extra[column] = row[column] ?? "";
    return record;
  });
  return { records, extraColumns };
}

export function serializeApplicationsCsv(file: ApplicationsFile): string {
  const fields = [...CSV_COLUMNS, ...file.extraColumns];
  const data = file.records.map((record) =>
    fields.map((field) =>
      KNOWN.has(field)
        ? record[FIELD_FOR_COLUMN[field as CsvColumn]]
        : (record.extra[field] ?? ""),
    ),
  );
  return Papa.unparse({ fields, data }, { newline: "\n" }).replace(/\n+$/, "") + "\n";
}

/** "2026-10-07T11:42:05-04:00" — readable in a spreadsheet, unambiguous for the app. */
export function localIsoTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
}
