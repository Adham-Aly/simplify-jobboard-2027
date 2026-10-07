import { test as base, type BrowserContext, chromium, expect, type Page } from "@playwright/test";

/**
 * Native file pickers can't be driven by a test, so they're replaced with
 * ones that hand back a file in the browser's private file system (OPFS).
 * Everything after the picker — permissions, reads, writes — is the real API.
 */
async function stubFilePickers(page: Page) {
  await page.addInitScript(() => {
    const pick = async () => {
      const root = await navigator.storage.getDirectory();
      return root.getFileHandle("job-applications.csv", { create: true });
    };
    Object.assign(window, {
      showSaveFilePicker: pick,
      showOpenFilePicker: async () => [await pick()],
    });
  });
}

export async function readCsv(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle("job-applications.csv", { create: true });
    return (await handle.getFile()).text();
  });
}

export async function writeCsv(page: Page, text: string): Promise<void> {
  await page.evaluate(async (content) => {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle("job-applications.csv", { create: true });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }, text);
}

/*
 * Each test gets a fresh, regular (non-incognito) browser profile. Chromium's
 * default incognito-style test contexts crash when a stored file handle is read
 * back from IndexedDB, which never happens in a normal profile.
 */
export const test = base.extend<{ context: BrowserContext; page: Page }>({
  context: async ({ baseURL, viewport }, provide, testInfo) => {
    const context = await chromium.launchPersistentContext(testInfo.outputPath("profile"), {
      channel: "chromium",
      baseURL,
      viewport,
    });
    await provide(context);
    await context.close();
  },
  page: async ({ context }, provide) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await stubFilePickers(page);
    await provide(page);
  },
});

export { expect };
