"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useApplications } from "@/lib/applications/use-applications";
import { DEFAULT_FILTERS, type Filters, filterJobs, filtersFromParams, filtersToParams } from "@/lib/filters";
import type { Category, Job } from "@/lib/readme/types";
import { useBoard } from "@/lib/readme/use-board";
import { AppHeader } from "./AppHeader";
import { ApplicationsView } from "./ApplicationsView";
import { BoardFooter } from "./BoardFooter";
import { BoardToolbar, CategoryTabs } from "./BoardNav";
import { ConnectGate } from "./ConnectGate";
import { JobTable } from "./JobTable";
import { ResumeMenuProvider } from "./ResumeMenu";
import { ToastProvider } from "./Toasts";
import { useTrackerActions } from "./useTrackerActions";

export function JobBoardApp() {
  return (
    <ToastProvider>
      <ResumeMenuProvider>
        <JobBoard />
      </ResumeMenuProvider>
    </ToastProvider>
  );
}

/**
 * Filters are ordinary React state, seeded from the URL and mirrored back to it,
 * so a reload (which refetches the list) keeps your place.
 */
function useFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const searchParams = useSearchParams();
  const [filters, setFiltersState] = useState(() =>
    filtersFromParams(new URLSearchParams(searchParams.toString())),
  );

  useEffect(() => {
    const query = filtersToParams(filters).toString();
    if (query !== window.location.search.replace(/^\?/, "")) {
      window.history.replaceState(window.history.state, "", query ? `?${query}` : window.location.pathname);
    }
  }, [filters]);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setFiltersState((current) => ({ ...current, ...patch }));
  }, []);

  return [filters, setFilters];
}

/** Tracks an element's height; a callback ref so it works whenever the element mounts. */
function useElementHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState(0);
  const ref = useCallback((el: T | null) => {
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

function SkeletonRows() {
  return (
    <div aria-label="Loading the job list" className="divide-y divide-line">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="flex animate-shimmer items-center gap-6 px-5 py-4" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="h-3.5 w-[16%] rounded bg-line" />
          <div className="h-3.5 flex-1 rounded bg-line/80" />
          <div className="h-3.5 w-[12%] rounded bg-line/70" />
          <div className="h-6 w-24 rounded-md bg-line/70" />
          <div className="h-3.5 w-8 rounded bg-line/60" />
          <div className="h-6 w-28 rounded-md bg-line/60" />
        </div>
      ))}
    </div>
  );
}

function JobBoard() {
  const applications = useApplications();
  const { state: boardState, board, refresh } = useBoard();
  const [filters, setFilters] = useFilters();
  const [browseOnly, setBrowseOnly] = useState(false);
  const [stickyRef, stickyHeight] = useElementHeight<HTMLDivElement>();
  const actions = useTrackerActions(applications);

  const canTrack = applications.connection.status === "connected";
  const showGate = !canTrack && !browseOnly;

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of board?.categories ?? []) map.set(c.id, c);
    return map;
  }, [board]);

  const jobsById = useMemo(() => {
    const map = new Map<string, Job>();
    for (const job of board?.jobs ?? []) map.set(job.id, job);
    return map;
  }, [board]);

  const activeCategory = categoriesById.get(filters.category) ?? null;
  const effectiveFilters = useMemo(
    () => (board && filters.category !== "all" && !activeCategory ? { ...filters, category: "all" } : filters),
    [board, filters, activeCategory],
  );
  const deferredQuery = useDeferredValue(effectiveFilters.query);

  const visibleJobs = useMemo(
    () => (board ? filterJobs(board.jobs, effectiveFilters, applications.byJobId, deferredQuery) : []),
    [board, effectiveFilters, applications.byJobId, deferredQuery],
  );

  const appliedByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of applications.records) {
      const job = jobsById.get(record.jobId);
      if (job) counts.set(job.categoryId, (counts.get(job.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [applications.records, jobsById]);

  const resetKey = useMemo(
    () => JSON.stringify({ ...effectiveFilters, query: deferredQuery }),
    [effectiveFilters, deferredQuery],
  );

  if (showGate) {
    return (
      <ConnectGate
        applications={applications}
        onBrowseOnly={() => setBrowseOnly(true)}
      />
    );
  }

  const columns = activeCategory?.columns ?? board?.columns ?? [];

  return (
    <div className="mx-auto w-full max-w-[1480px] min-w-[1020px] px-6">
      <div ref={stickyRef} className="sticky top-0 z-20 bg-paper/90 backdrop-blur-md">
        <AppHeader
          board={board}
          boardState={boardState}
          onRefresh={() => void refresh()}
          applications={applications}
          canTrack={canTrack}
          view={effectiveFilters.view}
          onViewChange={(view) => setFilters({ view })}
        />
        {board && effectiveFilters.view === "board" && (
          <div className="border-b border-line">
            <CategoryTabs
              board={board}
              filters={effectiveFilters}
              setFilters={setFilters}
              appliedByCategory={appliedByCategory}
              appliedTotal={applications.records.length}
              canTrack={canTrack}
            />
          </div>
        )}
        {board && effectiveFilters.view === "board" && (
          <BoardToolbar
            board={board}
            filters={effectiveFilters}
            setFilters={setFilters}
            shown={visibleJobs.length}
            canTrack={canTrack}
          />
        )}
        {effectiveFilters.view === "applications" && <div className="h-1" />}
      </div>

      {boardState.status === "error" && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13.5px] text-danger">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          <div className="flex-1">
            <span className="font-medium">Couldn’t load the job list.</span> {boardState.message}
            {board && " Showing the list loaded earlier in this session."}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 font-medium text-ink-soft shadow-card hover:text-ink"
          >
            <RefreshCw aria-hidden className="size-3.5" />
            Retry
          </button>
        </div>
      )}

      <section className="overflow-clip rounded-xl border border-line bg-surface shadow-card">
        {!board ? (
          boardState.status === "loading" ? (
            <SkeletonRows />
          ) : (
            <div className="px-6 py-20 text-center text-sm text-muted">The job list couldn’t be loaded.</div>
          )
        ) : effectiveFilters.view === "applications" && canTrack ? (
          <ApplicationsView
            applications={applications}
            jobsById={jobsById}
            boardLoaded={Boolean(board)}
            actions={actions}
            stickyOffset={stickyHeight}
          />
        ) : (
          <JobTable
            jobs={visibleJobs}
            columns={columns}
            applied={applications.byJobId}
            canTrack={canTrack}
            categoriesById={categoriesById}
            showCategory={effectiveFilters.category === "all"}
            actions={actions}
            stickyOffset={stickyHeight}
            resetKey={resetKey}
            onClearFilters={() => setFilters({ ...DEFAULT_FILTERS, category: effectiveFilters.category })}
          />
        )}
      </section>

      {board && <BoardFooter board={board} applications={applications} canTrack={canTrack} />}
    </div>
  );
}
