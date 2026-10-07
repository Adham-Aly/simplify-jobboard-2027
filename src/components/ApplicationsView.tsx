"use client";

import { ExternalLink, Inbox, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { ApplicationRecord } from "@/lib/applications/csv";
import type { Applications } from "@/lib/applications/use-applications";
import { matchesQuery } from "@/lib/filters";
import type { Job } from "@/lib/readme/types";
import { formatAppliedDate, ResumeChip } from "./ApplicationControl";
import { SearchBox } from "./BoardNav";
import type { TrackerActions } from "./useTrackerActions";

const linkButton =
  "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors";

function appliedTime(record: ApplicationRecord): number {
  const t = new Date(record.appliedAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function ApplicationsView({
  applications,
  jobsById,
  boardLoaded,
  actions,
  stickyOffset,
}: {
  applications: Applications;
  jobsById: Map<string, Job>;
  boardLoaded: boolean;
  actions: TrackerActions;
  stickyOffset: number;
}) {
  const [query, setQuery] = useState("");
  const [resumeFilter, setResumeFilter] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const byResume = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of applications.records) counts.set(r.resumeVersion, (counts.get(r.resumeVersion) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [applications.records]);

  const rows = useMemo(
    () =>
      applications.records
        .filter((r) => resumeFilter === null || r.resumeVersion === resumeFilter)
        .filter((r) =>
          matchesQuery([r.company, r.role, r.location, r.category, r.resumeVersion].join(" "), deferredQuery),
        )
        .sort((a, b) => appliedTime(b) - appliedTime(a)),
    [applications.records, resumeFilter, deferredQuery],
  );

  if (applications.records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-paper text-faint">
          <Inbox aria-hidden className="size-5" />
        </div>
        <div className="font-medium text-ink">No applications yet</div>
        <p className="max-w-sm text-sm leading-5 text-muted">
          Open a role’s <span className="font-medium text-ink-soft">Apply</span> link, then hit{" "}
          <span className="font-medium text-ink-soft">Mark applied</span>. It’ll show up here and in{" "}
          <code className="font-mono text-[0.92em]">{applications.fileName}</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
        <SearchBox value={query} onChange={setQuery} placeholder="Search your applications" />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 ml-1 text-[12px] text-muted">By resume</span>
          {byResume.map(([label, count]) => {
            const active = resumeFilter === label;
            return (
              <button
                key={label || "(none)"}
                type="button"
                aria-pressed={active}
                onClick={() => setResumeFilter(active ? null : label)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12.5px] transition-colors ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink"
                }`}
              >
                <span className={label ? "" : "italic"}>{label || "No label"}</span>
                <span className={`tabular-nums ${active ? "text-white/70" : "text-faint"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto text-[12.5px] text-muted tabular-nums">
          {rows.length} of {applications.records.length}
        </div>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-[19%]" />
          <col />
          <col className="w-[15%]" />
          <col className="w-[150px]" />
          <col className="w-[118px]" />
          <col className="w-[200px]" />
          <col className="w-[48px]" />
        </colgroup>
        <thead>
          <tr>
            {["Company", "Role", "Location", "Resume", "Applied", "Links", ""].map((c, i) => (
              <th
                key={c || "actions"}
                scope="col"
                style={{ top: stickyOffset }}
                className={`sticky z-10 border-b border-line bg-surface/95 px-3 py-2 text-left text-[11.5px] font-semibold tracking-wide text-muted uppercase backdrop-blur ${
                  i === 0 ? "pl-5" : ""
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((record, index) => {
            const job = jobsById.get(record.jobId);
            const applyUrl = job?.applyUrl ?? record.applyUrl;
            const simplifyUrl = job?.simplifyUrl ?? record.simplifyUrl;
            const companyUrl = job?.companyUrl ?? record.companyUrl;
            const cell = "border-b border-line px-3 py-2.5 align-top text-[13.5px] leading-5";
            return (
              <tr key={record.jobId || `row-${index}`} className="hover:bg-paper/70">
                <td className={`${cell} pl-5`}>
                  {companyUrl ? (
                    <a
                      href={companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-ink hover:text-accent hover:underline"
                    >
                      {record.company}
                    </a>
                  ) : (
                    <span className="font-semibold text-ink">{record.company}</span>
                  )}
                </td>
                <td className={cell}>
                  <div className="font-medium text-ink">{record.role}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-faint">
                    {record.category && <span>{record.category}</span>}
                    {boardLoaded &&
                      (job ? (
                        <span className="inline-flex items-center gap-1 text-done">
                          <span className="size-1.5 rounded-full bg-done" />
                          Still listed
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1"
                          title="This role is no longer on the README's open list (it may have closed)."
                        >
                          <span className="size-1.5 rounded-full bg-faint" />
                          No longer listed
                        </span>
                      ))}
                  </div>
                </td>
                <td className={`${cell} text-ink-soft`}>
                  {record.location.split(/;\s*/).filter(Boolean).map((l) => (
                    <div key={l}>{l}</div>
                  ))}
                </td>
                <td className={cell}>
                  <ResumeChip
                    label={record.resumeVersion}
                    onClick={(anchor) => actions.changeResume(record.jobId, anchor)}
                  />
                </td>
                <td className={`${cell} text-ink-soft tabular-nums`} title={formatAppliedDate(record.appliedAt, "long")}>
                  {formatAppliedDate(record.appliedAt)}
                </td>
                <td className={cell}>
                  <div className="flex gap-1.5">
                    {applyUrl && (
                      <a
                        href={applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${linkButton} border border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink`}
                      >
                        Posting <ExternalLink aria-hidden className="size-3 opacity-70" />
                      </a>
                    )}
                    {simplifyUrl && (
                      <a
                        href={simplifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${linkButton} border border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink`}
                      >
                        Simplify <ExternalLink aria-hidden className="size-3 opacity-70" />
                      </a>
                    )}
                  </div>
                </td>
                <td className={`${cell} pr-4`}>
                  {record.jobId && (
                    <button
                      type="button"
                      onClick={() => actions.remove(record.jobId)}
                      title="Remove from your applications"
                      aria-label={`Remove ${record.company} ${record.role} from your applications`}
                      className="rounded-md p-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <X aria-hidden className="size-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="px-6 py-16 text-center text-sm text-muted">No applications match.</div>
      )}
    </>
  );
}
