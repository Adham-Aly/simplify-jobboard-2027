"use client";

import { FileSpreadsheet, GitCommitHorizontal, RefreshCw } from "lucide-react";
import type { Applications } from "@/lib/applications/use-applications";
import type { View } from "@/lib/filters";
import type { BoardState } from "@/lib/readme/use-board";
import type { LoadedBoard } from "@/lib/readme/fetch";
import { ResumeChip } from "./ApplicationControl";
import { ViewSwitch } from "./BoardNav";
import { Logo } from "./Logo";
import { useResumeMenu } from "./ResumeMenu";

function timeLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function AppHeader({
  board,
  boardState,
  onRefresh,
  applications,
  canTrack,
  view,
  onViewChange,
}: {
  view: View;
  onViewChange: (view: View) => void;
  board: LoadedBoard | null;
  boardState: BoardState;
  onRefresh: () => void;
  applications: Applications;
  canTrack: boolean;
}) {
  const openMenu = useResumeMenu();
  const loading = boardState.status === "loading";

  return (
    <div className="flex items-center gap-4 py-4">
      <Logo />
      <div className="min-w-0">
        <h1 className="truncate text-[15.5px] leading-5 font-semibold tracking-tight text-ink">
          simplify-jobboard-2027
        </h1>
        <p className="truncate text-[12.5px] leading-4 text-muted">
          Summer 2027 internships, live from{" "}
          <a
            href={board?.sourceUrl ?? "https://github.com/SimplifyJobs/Summer2027-Internships"}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent hover:underline"
          >
            SimplifyJobs/Summer2027-Internships
          </a>
        </p>
      </div>

      {canTrack && (
        <div className="ml-2 shrink-0">
          <ViewSwitch view={view} onChange={onViewChange} appliedTotal={applications.records.length} />
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <div className="flex shrink-0 items-center gap-1.5 text-[12px] whitespace-nowrap text-muted">
          {board && (
            <span
              className="inline-flex items-center gap-1"
              title={board.commitSha ? `README at commit ${board.commitSha}` : "README from the dev branch"}
            >
              <GitCommitHorizontal aria-hidden className="size-3.5 text-faint" />
              <span className="font-mono text-[11.5px]">
                {board.commitSha ? board.commitSha.slice(0, 7) : "dev"}
              </span>
              <span className="text-faint">·</span>
              {timeLabel(board.fetchedAt)}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Fetch the latest list from GitHub"
            aria-label="Refresh the job list"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-70"
          >
            <RefreshCw aria-hidden className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {canTrack && (
          <>
            <div className="h-6 w-px bg-line" />
            <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <span className="text-[12px] text-muted">Applying with</span>
              {applications.defaultResume ? (
                <ResumeChip
                  size="md"
                  label={applications.defaultResume}
                  onClick={(anchor) =>
                    openMenu({
                      anchor,
                      title: "Default resume",
                      description: "Used when you mark a role as applied. You can still pick a different one per job.",
                      current: applications.defaultResume,
                      labels: applications.resumeLabels,
                      confirmLabel: "Set",
                      onSelect: applications.setDefaultResume,
                    })
                  }
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) =>
                    openMenu({
                      anchor: e.currentTarget,
                      title: "Name the resume you’re applying with",
                      description:
                        "Any label you like, e.g. “SWE v3”. Applications you mark get tagged with it.",
                      current: "",
                      labels: applications.resumeLabels,
                      confirmLabel: "Set",
                      onSelect: applications.setDefaultResume,
                    })
                  }
                  className="inline-flex h-7 items-center rounded-md border border-dashed border-accent/50 bg-accent-soft/60 px-2.5 text-[13px] font-medium text-accent-strong hover:bg-accent-soft"
                >
                  Set a resume label
                </button>
              )}
            </div>
            <div className="h-6 w-px bg-line" />
            <span
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[12.5px] whitespace-nowrap text-ink-soft shadow-card"
              title={`Your applications are saved to ${applications.fileName}`}
            >
              <FileSpreadsheet aria-hidden className="size-3.5 text-done" />
              <span className="max-w-[180px] truncate font-medium">{applications.fileName}</span>
              <span
                aria-label={applications.saving ? "Saving" : "Saved"}
                className={`size-1.5 rounded-full ${applications.saving ? "animate-pulse bg-warn" : "bg-done"}`}
              />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
