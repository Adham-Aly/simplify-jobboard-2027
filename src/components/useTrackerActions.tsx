"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { Applications } from "@/lib/applications/use-applications";
import type { Job } from "@/lib/readme/types";
import { useResumeMenu } from "./ResumeMenu";
import { useToast } from "./Toasts";

export interface TrackerActions {
  /** Mark as applied with the default resume, or ask for one when `pick` is set or none is set. */
  markApplied: (job: Job, anchor: HTMLElement, pick?: boolean) => void;
  changeResume: (jobId: string, anchor: HTMLElement) => void;
  remove: (jobId: string) => void;
}

function describe(company: string, role: string) {
  return (
    <>
      <span className="font-medium">{company}</span>
      <span className="text-white/60"> · {role}</span>
    </>
  );
}

/**
 * Callbacks stay referentially stable (reading the latest state through a ref)
 * so the thousands of memoized job rows don't re-render on every change.
 */
export function useTrackerActions(applications: Applications): TrackerActions {
  const openMenu = useResumeMenu();
  const toast = useToast();
  const latest = useRef(applications);
  useLayoutEffect(() => {
    latest.current = applications;
  });

  const markApplied = useCallback(
    (job: Job, anchor: HTMLElement, pick = false) => {
      const apps = latest.current;
      const commit = async (label: string) => {
        const ok = await latest.current.markApplied(job, label);
        if (!ok) return;
        toast({
          tone: "success",
          message: (
            <>
              Applied with <span className="font-semibold">“{label}”</span> — {describe(job.company, job.role)}
            </>
          ),
          action: { label: "Undo", run: () => void latest.current.removeApplication(job.id) },
        });
      };

      if (!pick && apps.defaultResume) {
        void commit(apps.defaultResume);
        return;
      }
      const firstTime = !apps.defaultResume;
      openMenu({
        anchor,
        title: "Which resume did you apply with?",
        description: firstTime
          ? "This also becomes your default, so next time it’s one click."
          : undefined,
        current: apps.defaultResume,
        labels: apps.resumeLabels,
        confirmLabel: "Apply",
        onSelect: (label) => {
          if (firstTime) latest.current.setDefaultResume(label);
          void commit(label);
        },
      });
    },
    [openMenu, toast],
  );

  const changeResume = useCallback(
    (jobId: string, anchor: HTMLElement) => {
      const apps = latest.current;
      const record = apps.byJobId.get(jobId);
      openMenu({
        anchor,
        title: "Resume used for this application",
        description: record ? `${record.company} · ${record.role}` : undefined,
        current: record?.resumeVersion ?? "",
        labels: apps.resumeLabels,
        onSelect: (label) => void latest.current.setResumeVersion(jobId, label),
      });
    },
    [openMenu],
  );

  const remove = useCallback(
    (jobId: string) => {
      const record = latest.current.byJobId.get(jobId);
      if (!record) return;
      void latest.current.removeApplication(jobId).then((ok) => {
        if (!ok) return;
        toast({
          tone: "neutral",
          message: <>Removed from your applications — {describe(record.company, record.role)}</>,
          action: { label: "Undo", run: () => void latest.current.restoreApplication(record) },
        });
      });
    },
    [toast],
  );

  return useMemo(() => ({ markApplied, changeResume, remove }), [markApplied, changeResume, remove]);
}
