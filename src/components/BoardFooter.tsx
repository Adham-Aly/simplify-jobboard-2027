"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import type { Applications } from "@/lib/applications/use-applications";
import type { LoadedBoard } from "@/lib/readme/fetch";

const number = new Intl.NumberFormat();

export function BoardFooter({
  board,
  applications,
  canTrack,
}: {
  board: LoadedBoard;
  applications: Applications;
  canTrack: boolean;
}) {
  const mismatches = board.categories.filter(
    (c) => c.expectedCount !== null && c.expectedCount !== c.jobs.length,
  );
  const totalMatches = board.expectedTotal === null || board.expectedTotal === board.jobs.length;
  const verified = totalMatches && mismatches.length === 0;

  return (
    <footer className="mt-6 mb-16 grid gap-6 text-[12.5px] leading-5 text-muted md:grid-cols-[1fr_auto]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {board.legend.map((entry) => (
            <span key={entry.symbol} className="inline-flex items-center gap-1.5">
              <span aria-hidden>{entry.symbol}</span>
              {entry.meaning}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {board.categories
            .filter((c) => c.closedRolesLink)
            .map((c) => (
              <a
                key={c.id}
                href={c.closedRolesLink!.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent hover:underline"
              >
                {c.title}: {c.closedRolesLink!.label}
              </a>
            ))}
        </div>
      </div>

      <div className="space-y-1 md:text-right">
        <div className={`inline-flex items-center gap-1.5 ${verified ? "text-done" : "text-warn"}`}>
          {verified ? (
            <CircleCheck aria-hidden className="size-3.5" />
          ) : (
            <CircleAlert aria-hidden className="size-3.5" />
          )}
          {verified
            ? `All ${number.format(board.jobs.length)} roles from the README are shown`
            : `Showing ${number.format(board.jobs.length)} roles; the README says ${
                board.expectedTotal === null ? "a different number" : number.format(board.expectedTotal)
              }`}
        </div>
        {!verified && mismatches.length > 0 && (
          <div>
            {mismatches.map((c) => `${c.title}: ${c.jobs.length} of ${c.expectedCount}`).join(" · ")}
          </div>
        )}
        <div>
          Read from{" "}
          <a href={board.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent hover:underline">
            README.md{board.commitSha ? ` @ ${board.commitSha.slice(0, 7)}` : " (dev)"}
          </a>{" "}
          at {board.fetchedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}{" "}
          · not stored anywhere
        </div>
        {canTrack && (
          <div>
            Applications saved to{" "}
            <span className="font-medium text-ink-soft">{applications.fileName}</span> ·{" "}
            <button
              type="button"
              onClick={() => void applications.disconnect()}
              className="font-medium text-ink-soft underline decoration-line-strong underline-offset-2 hover:text-accent"
            >
              Switch file
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
