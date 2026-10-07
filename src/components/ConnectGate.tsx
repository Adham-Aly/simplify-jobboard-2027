"use client";

import { CircleAlert, FilePlus2, FolderOpen, GitBranch, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Applications } from "@/lib/applications/use-applications";
import { FILE_NAME } from "@/lib/applications/file-system";
import { Logo } from "./Logo";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-[520px] rounded-2xl border border-line bg-surface p-8 shadow-pop sm:p-10">
        {children}
      </div>
    </main>
  );
}

function Busy({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <>{children}</>;
}

export function ConnectGate({
  applications,
  onBrowseOnly,
}: {
  applications: Applications;
  onBrowseOnly: () => void;
}) {
  const { connection } = applications;
  const [busy, setBusy] = useState<string | null>(null);

  const run = (name: string, action: () => Promise<void>) => async () => {
    setBusy(name);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const primary =
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[14.5px] font-medium text-white shadow-sm transition-colors hover:bg-black disabled:opacity-60";
  const secondary =
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-[14.5px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60";

  if (connection.status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 aria-label="Loading" className="size-5 animate-spin text-faint" />
      </main>
    );
  }

  if (connection.status === "unsupported") {
    return (
      <Shell>
        <Logo size="lg" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">This browser can’t open local files</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted">
          Tracking your applications in <code className="font-mono text-[0.9em] text-ink-soft">{FILE_NAME}</code>{" "}
          needs the File System Access API, which is available in Chrome, Edge, Arc, Opera and other
          Chromium-based browsers.
        </p>
        <button type="button" onClick={onBrowseOnly} className={`${secondary} mt-8`}>
          Browse the list without tracking
        </button>
      </Shell>
    );
  }

  if (connection.status === "needs-permission") {
    return (
      <Shell>
        <Logo size="lg" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted">
          Your browser asks before letting the app use{" "}
          <code className="font-mono text-[0.9em] text-ink-soft">{connection.handle.name}</code> again.
          Choose <span className="font-medium text-ink-soft">“Allow on every visit”</span> to skip this step next time.
        </p>
        <div className="mt-8 flex flex-col gap-2.5">
          <button type="button" className={primary} disabled={!!busy} onClick={run("reconnect", applications.reconnect)}>
            <Busy busy={busy === "reconnect"}>
              <RefreshCw aria-hidden className="size-4" />
              Continue with {connection.handle.name}
            </Busy>
          </button>
          <button type="button" className={secondary} disabled={!!busy} onClick={run("disconnect", applications.disconnect)}>
            Use a different file
          </button>
        </div>
      </Shell>
    );
  }

  if (connection.status === "error") {
    return (
      <Shell>
        <div className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
          <CircleAlert aria-hidden className="size-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Can’t use the applications file</h1>
        <p className="mt-3 text-[15px] leading-6 text-muted">{connection.message}</p>
        <div className="mt-8 flex flex-col gap-2.5">
          {connection.handle && (
            <button type="button" className={primary} disabled={!!busy} onClick={run("reconnect", applications.reconnect)}>
              <Busy busy={busy === "reconnect"}>
                <RefreshCw aria-hidden className="size-4" />
                Try {connection.handle.name} again
              </Busy>
            </button>
          )}
          <button type="button" className={secondary} disabled={!!busy} onClick={run("open", applications.openFile)}>
            <Busy busy={busy === "open"}>
              <FolderOpen aria-hidden className="size-4" />
              Open a different file
            </Busy>
          </button>
          <button type="button" className={secondary} disabled={!!busy} onClick={run("create", applications.createFile)}>
            <Busy busy={busy === "create"}>
              <FilePlus2 aria-hidden className="size-4" />
              Create a new {FILE_NAME}
            </Busy>
          </button>
        </div>
      </Shell>
    );
  }

  // First visit: nothing chosen yet.
  return (
    <Shell>
      <Logo size="lg" />
      <h1 className="mt-6 text-[26px] leading-8 font-semibold tracking-tight">simplify-jobboard-2027</h1>
      <p className="mt-2 text-[15px] leading-6 text-muted">
        Every Summer 2027 internship from the SimplifyJobs list, with the roles you’ve applied to and the
        resume you used tracked alongside.
      </p>

      <ul className="mt-6 space-y-3 text-[14px] leading-5 text-ink-soft">
        <li className="flex gap-3">
          <GitBranch aria-hidden className="mt-0.5 size-4 shrink-0 text-faint" />
          <span>The job list is fetched fresh from GitHub each time you load the page. None of it is saved.</span>
        </li>
        <li className="flex gap-3">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-faint" />
          <span>
            Your applications are kept in a single{" "}
            <code className="font-mono text-[0.92em] text-ink">{FILE_NAME}</code> that you choose. It’s the
            only file this app reads or writes.
          </span>
        </li>
      </ul>

      <div className="mt-8 flex flex-col gap-2.5">
        <button type="button" className={primary} disabled={!!busy} onClick={run("create", applications.createFile)}>
          <Busy busy={busy === "create"}>
            <FilePlus2 aria-hidden className="size-4" />
            Create {FILE_NAME}
          </Busy>
        </button>
        <button type="button" className={secondary} disabled={!!busy} onClick={run("open", applications.openFile)}>
          <Busy busy={busy === "open"}>
            <FolderOpen aria-hidden className="size-4" />
            I already have one
          </Busy>
        </button>
      </div>
    </Shell>
  );
}
