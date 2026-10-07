"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Job } from "@/lib/readme/types";
import {
  type ApplicationRecord,
  type ApplicationsFile,
  localIsoTimestamp,
  NotAnApplicationsFileError,
  parseApplicationsCsv,
  serializeApplicationsCsv,
} from "./csv";
import {
  forgetStoredHandle,
  hasPermission,
  isFileSystemAccessSupported,
  loadDefaultResumeLabel,
  loadStoredHandle,
  pickExistingFile,
  pickNewFile,
  readFileText,
  requestPermission,
  storeDefaultResumeLabel,
  storeHandle,
  writeFileText,
} from "./file-system";

export type Connection =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "disconnected" }
  | { status: "needs-permission"; handle: FileSystemFileHandle }
  | { status: "connected"; handle: FileSystemFileHandle }
  | { status: "error"; handle: FileSystemFileHandle | null; message: string };

function describeError(error: unknown): string {
  if (error instanceof NotAnApplicationsFileError) return error.message;
  if (error instanceof DOMException) {
    if (error.name === "NotFoundError") {
      return "The applications file can't be found. It may have been moved, renamed or deleted.";
    }
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "The browser didn't grant access to the applications file.";
    }
    if (error.name === "NoModificationAllowedError" || error.name === "InvalidStateError") {
      return "The applications file is locked or was changed while saving. Try again.";
    }
  }
  return error instanceof Error ? error.message : String(error);
}

export function recordFromJob(job: Job, resumeVersion: string): ApplicationRecord {
  return {
    jobId: job.id,
    company: job.company,
    role: job.role,
    location: job.locations.join("; "),
    category: job.categoryTitle,
    resumeVersion,
    appliedAt: localIsoTimestamp(),
    applyUrl: job.applyUrl ?? "",
    simplifyUrl: job.simplifyUrl ?? "",
    companyUrl: job.companyUrl ?? "",
    extra: {},
  };
}

export function useApplications() {
  const [connection, setConnection] = useState<Connection>({ status: "checking" });
  const [file, setFile] = useState<ApplicationsFile>({ records: [], extraColumns: [] });
  const [defaultResume, setDefaultResumeState] = useState("");
  const [saving, setSaving] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const handle =
    connection.status === "connected" ? connection.handle : null;

  /** Read (and if needed initialize) a file, then make it the active one. */
  const connect = useCallback(async (next: FileSystemFileHandle) => {
    try {
      const text = await readFileText(next);
      const parsed = parseApplicationsCsv(text);
      if (text.trim() === "") await writeFileText(next, serializeApplicationsCsv(parsed));
      await storeHandle(next);
      setFile(parsed);
      setConnection({ status: "connected", handle: next });
    } catch (error) {
      setConnection({ status: "error", handle: next, message: describeError(error) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const label = await loadDefaultResumeLabel().catch(() => "");
      if (!cancelled) setDefaultResumeState(label);
      if (!isFileSystemAccessSupported()) {
        if (!cancelled) setConnection({ status: "unsupported" });
        return;
      }
      const stored = await loadStoredHandle().catch(() => null);
      if (cancelled) return;
      if (!stored) {
        setConnection({ status: "disconnected" });
      } else if (await hasPermission(stored)) {
        if (!cancelled) await connect(stored);
      } else if (!cancelled) {
        setConnection({ status: "needs-permission", handle: stored });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connect]);

  /** Pick up edits made to the CSV outside the app (e.g. in a spreadsheet). */
  const reload = useCallback(async () => {
    if (!handle) return;
    try {
      setFile(parseApplicationsCsv(await readFileText(handle)));
    } catch (error) {
      setConnection({ status: "error", handle, message: describeError(error) });
    }
  }, [handle]);

  useEffect(() => {
    if (!handle) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [handle, reload]);

  /**
   * Every change re-reads the file first, so edits made elsewhere are never
   * clobbered, and changes are applied one at a time in order.
   */
  const mutate = useCallback(
    (change: (records: ApplicationRecord[]) => ApplicationRecord[]): Promise<boolean> => {
      if (!handle) return Promise.resolve(false);
      const run = async () => {
        setSaving(true);
        try {
          const current = parseApplicationsCsv(await readFileText(handle));
          const next: ApplicationsFile = { ...current, records: change(current.records) };
          await writeFileText(handle, serializeApplicationsCsv(next));
          setFile(next);
          return true;
        } catch (error) {
          setConnection({ status: "error", handle, message: describeError(error) });
          return false;
        } finally {
          setSaving(false);
        }
      };
      const result = queue.current.then(run, run);
      queue.current = result;
      return result;
    },
    [handle],
  );

  const markApplied = useCallback(
    (job: Job, resumeVersion: string) =>
      mutate((records) => {
        const existing = records.find((r) => r.jobId === job.id);
        if (existing) {
          return records.map((r) => (r === existing ? { ...r, resumeVersion } : r));
        }
        return [...records, recordFromJob(job, resumeVersion)];
      }),
    [mutate],
  );

  const setResumeVersion = useCallback(
    (jobId: string, resumeVersion: string) =>
      mutate((records) =>
        records.map((r) => (r.jobId === jobId ? { ...r, resumeVersion } : r)),
      ),
    [mutate],
  );

  const removeApplication = useCallback(
    (jobId: string) => mutate((records) => records.filter((r) => r.jobId !== jobId)),
    [mutate],
  );

  const restoreApplication = useCallback(
    (record: ApplicationRecord) =>
      mutate((records) =>
        records.some((r) => r.jobId === record.jobId) ? records : [...records, record],
      ),
    [mutate],
  );

  const setDefaultResume = useCallback((label: string) => {
    setDefaultResumeState(label);
    void storeDefaultResumeLabel(label);
  }, []);

  const createFile = useCallback(async () => {
    const picked = await pickNewFile();
    if (picked) await connect(picked);
  }, [connect]);

  const openFile = useCallback(async () => {
    const picked = await pickExistingFile();
    if (picked) await connect(picked);
  }, [connect]);

  const reconnect = useCallback(async () => {
    if (connection.status !== "needs-permission" && connection.status !== "error") return;
    const target = connection.handle;
    if (!target) return;
    try {
      if (await requestPermission(target)) await connect(target);
    } catch (error) {
      setConnection({ status: "error", handle: target, message: describeError(error) });
    }
  }, [connection, connect]);

  const disconnect = useCallback(async () => {
    await forgetStoredHandle();
    setFile({ records: [], extraColumns: [] });
    setConnection({ status: "disconnected" });
  }, []);

  const byJobId = useMemo(() => {
    const map = new Map<string, ApplicationRecord>();
    for (const record of file.records) if (record.jobId) map.set(record.jobId, record);
    return map;
  }, [file.records]);

  const resumeLabels = useMemo(() => {
    const labels = new Set<string>();
    if (defaultResume) labels.add(defaultResume);
    for (const record of file.records) if (record.resumeVersion) labels.add(record.resumeVersion);
    return Array.from(labels).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [file.records, defaultResume]);

  return {
    connection,
    fileName: connection.status === "connected" ? connection.handle.name : null,
    records: file.records,
    byJobId,
    resumeLabels,
    defaultResume,
    saving,
    setDefaultResume,
    markApplied,
    setResumeVersion,
    removeApplication,
    restoreApplication,
    createFile,
    openFile,
    reconnect,
    disconnect,
  };
}

export type Applications = ReturnType<typeof useApplications>;
