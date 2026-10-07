"use client";

import { SearchX } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ApplicationRecord } from "@/lib/applications/csv";
import type { Category, Job } from "@/lib/readme/types";
import { ApplicationControl } from "./ApplicationControl";
import { CellContent } from "./CellContent";
import type { TrackerActions } from "./useTrackerActions";

const INITIAL_ROWS = 150;
const ROWS_PER_PAGE = 400;

const COLUMN_WIDTHS: Record<string, string> = {
  Company: "w-[19%]",
  Role: "",
  Location: "w-[16%]",
  Application: "w-[196px]",
  Age: "w-[64px]",
};

function columnKind(column: string): "company" | "role" | "location" | "application" | "age" | "other" {
  if (/company/i.test(column)) return "company";
  if (/role|position|title/i.test(column)) return "role";
  if (/location/i.test(column)) return "location";
  if (/appl/i.test(column)) return "application";
  if (/age|date|posted/i.test(column)) return "age";
  return "other";
}

interface RowProps {
  job: Job;
  columns: string[];
  record: ApplicationRecord | undefined;
  canTrack: boolean;
  highlighted: boolean;
  category: Category | null;
  actions: TrackerActions;
  onLinkOpen: (jobId: string, label: string) => void;
}

const JobRow = memo(function JobRow({
  job,
  columns,
  record,
  canTrack,
  highlighted,
  category,
  actions,
  onLinkOpen,
}: RowProps) {
  const applied = Boolean(record);
  const linkOpen = (_href: string, label: string) => onLinkOpen(job.id, label);

  return (
    <tr
      data-job-id={job.id}
      className={`group/row transition-colors ${
        applied ? "bg-done-soft/45 hover:bg-done-soft/70" : highlighted ? "bg-accent-soft/40" : "hover:bg-paper/70"
      }`}
    >
      {columns.map((column, i) => {
        const kind = columnKind(column);
        const nodes = job.cells[column] ?? [];
        const first = i === 0;
        const base = `border-b border-line px-3 py-2.5 align-top text-[13.5px] leading-5 ${
          first ? `pl-5 ${applied ? "shadow-[inset_3px_0_0_var(--color-done)]" : ""}` : ""
        }`;

        if (kind === "company") {
          return (
            <td key={column} className={base}>
              {job.isContinuation ? (
                <span className="flex items-baseline gap-1.5 text-muted">
                  <span aria-hidden className="text-faint">
                    ↳
                  </span>
                  {job.companyUrl ? (
                    <a
                      href={job.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent hover:underline"
                    >
                      {job.company}
                    </a>
                  ) : (
                    job.company
                  )}
                </span>
              ) : (
                <span className="text-ink">
                  <CellContent nodes={nodes} />
                </span>
              )}
            </td>
          );
        }
        if (kind === "role") {
          return (
            <td key={column} className={base}>
              <span className="font-medium text-ink">
                <CellContent nodes={nodes} />
              </span>
              {category && (
                <span className="mt-1 flex items-center gap-1 text-[11.5px] text-faint">
                  <span aria-hidden>{category.emoji}</span>
                  {category.title}
                </span>
              )}
            </td>
          );
        }
        if (kind === "application") {
          return (
            <td key={column} className={base}>
              <CellContent nodes={nodes} onLinkOpen={linkOpen} />
            </td>
          );
        }
        if (kind === "age") {
          return (
            <td key={column} className={`${base} whitespace-nowrap text-muted tabular-nums`}>
              <CellContent nodes={nodes} />
            </td>
          );
        }
        return (
          <td key={column} className={`${base} text-ink-soft`}>
            <CellContent nodes={nodes} />
          </td>
        );
      })}
      <td className="border-b border-line px-3 py-2.5 pr-5 align-top">
        <ApplicationControl
          job={job}
          record={record}
          canTrack={canTrack}
          highlighted={highlighted}
          actions={actions}
        />
      </td>
    </tr>
  );
});

export function JobTable({
  jobs,
  columns,
  applied,
  canTrack,
  categoriesById,
  showCategory,
  actions,
  stickyOffset,
  resetKey,
  onClearFilters,
}: {
  jobs: Job[];
  columns: string[];
  applied: Map<string, ApplicationRecord>;
  canTrack: boolean;
  categoriesById: Map<string, Category>;
  showCategory: boolean;
  actions: TrackerActions;
  stickyOffset: number;
  resetKey: string;
  onClearFilters: () => void;
}) {
  // Render in pages so the first paint is instant even with ~2,000 roles.
  const [page, setPage] = useState({ key: resetKey, count: INITIAL_ROWS });
  const count = page.key === resetKey ? page.count : INITIAL_ROWS;
  const sentinel = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPage((p) => ({
            key: resetKey,
            count: (p.key === resetKey ? p.count : INITIAL_ROWS) + ROWS_PER_PAGE,
          }));
        }
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [resetKey, count, jobs.length]);

  // Opening a posting nudges its row toward "Mark applied".
  const onLinkOpen = useCallback((jobId: string, label: string) => {
    if (!/^apply$/i.test(label) && !/simplify/i.test(label)) return;
    setOpened((prev) => (prev.has(jobId) ? prev : new Set(prev).add(jobId)));
  }, []);

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-paper text-faint">
          <SearchX aria-hidden className="size-5" />
        </div>
        <div>
          <div className="font-medium text-ink">No roles match these filters</div>
          <div className="mt-1 text-sm text-muted">Try a different search or loosen the filters.</div>
        </div>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft shadow-card hover:border-line-strong hover:text-ink"
        >
          Clear filters
        </button>
      </div>
    );
  }

  const visible = jobs.slice(0, count);

  return (
    <>
      <table className="w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          {columns.map((c) => (
            <col key={c} className={COLUMN_WIDTHS[c] ?? ""} />
          ))}
          <col className="w-[196px]" />
        </colgroup>
        <thead>
          <tr>
            {[...columns, "Your application"].map((c, i, all) => (
              <th
                key={c}
                scope="col"
                style={{ top: stickyOffset }}
                className={`sticky z-10 border-b border-line bg-surface/95 px-3 py-2 text-left text-[11.5px] font-semibold tracking-wide text-muted uppercase backdrop-blur ${
                  i === 0 ? "pl-5" : ""
                } ${i === all.length - 1 ? "pr-5" : ""}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              columns={columns}
              record={applied.get(job.id)}
              canTrack={canTrack}
              highlighted={opened.has(job.id)}
              category={showCategory ? (categoriesById.get(job.categoryId) ?? null) : null}
              actions={actions}
              onLinkOpen={onLinkOpen}
            />
          ))}
        </tbody>
      </table>
      {count < jobs.length && (
        <div ref={sentinel} className="py-6 text-center text-sm text-faint">
          Loading more roles…
        </div>
      )}
    </>
  );
}
