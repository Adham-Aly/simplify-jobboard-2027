import { createStore, del, get, set } from "idb-keyval";

/*
 * The File System Access API is how this app reaches job-applications.csv.
 * The browser lets a page remember a file handle (a pointer to the file the
 * user picked, never its contents) in IndexedDB so the user only picks it
 * once. That handle, plus the default resume label, is all the app keeps
 * outside the CSV itself.
 */

type PermissionMode = { mode: "readwrite" };

interface PermissionedHandle extends FileSystemFileHandle {
  queryPermission?(descriptor: PermissionMode): Promise<PermissionState>;
  requestPermission?(descriptor: PermissionMode): Promise<PermissionState>;
}

interface PickerType {
  description: string;
  accept: Record<string, string[]>;
}

interface PickerWindow {
  showSaveFilePicker(options: {
    id?: string;
    suggestedName?: string;
    types?: PickerType[];
  }): Promise<FileSystemFileHandle>;
  showOpenFilePicker(options: {
    id?: string;
    multiple?: boolean;
    types?: PickerType[];
  }): Promise<FileSystemFileHandle[]>;
}

export const FILE_NAME = "job-applications.csv";

const PICKER_ID = "simplify-jobboard-2027";
const CSV_TYPES: PickerType[] = [{ description: "CSV file", accept: { "text/csv": [".csv"] } }];

const store =
  typeof indexedDB === "undefined" ? undefined : createStore("simplify-jobboard-2027", "settings");
const HANDLE_KEY = "applications-file-handle";
const DEFAULT_RESUME_KEY = "default-resume-label";

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "showSaveFilePicker" in window &&
    "showOpenFilePicker" in window
  );
}

function pickerWindow(): PickerWindow {
  return window as unknown as PickerWindow;
}

/** Resolves to null when the user dismisses the picker. */
export async function pickNewFile(): Promise<FileSystemFileHandle | null> {
  try {
    return await pickerWindow().showSaveFilePicker({
      id: PICKER_ID,
      suggestedName: FILE_NAME,
      types: CSV_TYPES,
    });
  } catch (error) {
    if (isAbort(error)) return null;
    throw error;
  }
}

/** Resolves to null when the user dismisses the picker. */
export async function pickExistingFile(): Promise<FileSystemFileHandle | null> {
  try {
    const [handle] = await pickerWindow().showOpenFilePicker({
      id: PICKER_ID,
      multiple: false,
      types: CSV_TYPES,
    });
    return handle ?? null;
  } catch (error) {
    if (isAbort(error)) return null;
    throw error;
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function hasPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const h = handle as PermissionedHandle;
  if (!h.queryPermission) return true;
  return (await h.queryPermission({ mode: "readwrite" })) === "granted";
}

/** Must be called from a user gesture (click). */
export async function requestPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const h = handle as PermissionedHandle;
  if (!h.requestPermission) return true;
  return (await h.requestPermission({ mode: "readwrite" })) === "granted";
}

export async function readFileText(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFileText(handle: FileSystemFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(text);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
}

export async function loadStoredHandle(): Promise<FileSystemFileHandle | null> {
  if (!store) return null;
  return (await get<FileSystemFileHandle>(HANDLE_KEY, store)) ?? null;
}

export async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  if (store) await set(HANDLE_KEY, handle, store);
}

export async function forgetStoredHandle(): Promise<void> {
  if (store) await del(HANDLE_KEY, store);
}

export async function loadDefaultResumeLabel(): Promise<string> {
  if (!store) return "";
  return (await get<string>(DEFAULT_RESUME_KEY, store)) ?? "";
}

export async function storeDefaultResumeLabel(label: string): Promise<void> {
  if (store) await set(DEFAULT_RESUME_KEY, label, store);
}
