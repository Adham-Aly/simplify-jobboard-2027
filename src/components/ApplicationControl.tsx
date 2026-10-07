"use client";

import { Check, ChevronDown, FileText, X } from "lucide-react";
import type { ApplicationRecord } from "@/lib/applications/csv";
import type { Job } from "@/lib/readme/types";
import type { TrackerActions } from "./useTrackerActions";

export function formatAppliedDate(iso: string, style: "short" | "long" = "short"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || "Unknown date";
  if (style === "long") {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function ResumeChip({
  label,
  onClick,
  size = "sm",
}: {
  label: string;
  onClick: (anchor: HTMLElement) => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={(e) => onClick(e.currentTarget)}
      title="Change the resume version for this application"
      className={`group inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong hover:text-ink ${
        size === "md" ? "h-7 px-2 text-[13px]" : "h-6 px-1.5 text-[12px]"
      }`}
    >
      <FileText aria-hidden className="size-3 shrink-0 text-faint group-hover:text-muted" />
      <span className={`truncate ${label ? "" : "text-faint italic"}`}>{label || "No label"}</span>
      <ChevronDown aria-hidden className="size-3 shrink-0 text-faint" />
    </button>
  );
}

export function ApplicationControl({
  job,
  record,
  canTrack,
  highlighted,
  actions,
}: {
  job: Job;
  record: ApplicationRecord | undefined;
  canTrack: boolean;
  highlighted: boolean;
  actions: TrackerActions;
}) {
  if (!canTrack) return <span className="text-faint">—</span>;

  if (record) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-done"
          title={`Applied ${formatAppliedDate(record.appliedAt, "long")}`}
        >
          <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
          Applied {formatAppliedDate(record.appliedAt)}
        </span>
        <div className="flex max-w-full items-center gap-0.5">
          <ResumeChip label={record.resumeVersion} onClick={(a) => actions.changeResume(job.id, a)} />
          <button
            type="button"
            onClick={() => actions.remove(job.id)}
            title="Remove from your applications"
            aria-label={`Remove ${job.company} ${job.role} from your applications`}
            className="rounded-md p-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const tone = highlighted
    ? "border-accent/40 bg-accent-soft text-accent-strong hover:bg-[#dde5ff]"
    : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink";

  return (
    <div className={`inline-flex h-7 items-stretch overflow-hidden rounded-md border shadow-card ${tone}`}>
      <button
        type="button"
        onClick={(e) => actions.markApplied(job, e.currentTarget.parentElement ?? e.currentTarget)}
        className="inline-flex items-center gap-1 pr-2 pl-2 text-[12.5px] font-medium whitespace-nowrap"
      >
        <Check aria-hidden className="size-3.5" />
        {highlighted ? "Applied? Mark it" : "Mark applied"}
      </button>
      <button
        type="button"
        onClick={(e) => actions.markApplied(job, e.currentTarget.parentElement ?? e.currentTarget, true)}
        aria-label="Mark applied with a specific resume version"
        title="Choose which resume you used"
        className={`border-l px-1 ${highlighted ? "border-accent/30" : "border-line"}`}
      >
        <ChevronDown aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
