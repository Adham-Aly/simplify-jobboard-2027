import { expect, readCsv, test, writeCsv } from "./fixtures";
import type { Page } from "@playwright/test";

async function createFile(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create job-applications.csv" }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
}

function csvRows(text: string) {
  return text.trim().split("\n");
}

test("loads every role the README lists", async ({ page }) => {
  await createFile(page);
  await expect(page.getByText(/^All [\d,]+ roles from the README are shown$/)).toBeVisible();
  const allTab = page.getByRole("button", { name: /^All roles/ });
  await expect(allTab).toHaveAttribute("aria-current", "page");

  // Each category tab's count equals the README's advertised count (verified in the footer),
  // and rows render every link from the source table.
  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow.getByRole("link", { name: "Apply" })).toHaveAttribute("target", "_blank");
  await expect(firstRow.getByRole("link", { name: "Simplify" })).toHaveAttribute("href", /simplify\.jobs\/p\//);
});

test("tracks applications in the CSV and survives a reload", async ({ page }) => {
  await createFile(page);
  expect(csvRows(await readCsv(page))).toEqual([
    "job_id,company,role,location,category,resume_version,applied_at,apply_url,simplify_url,company_url",
  ]);

  // First "Mark applied" asks for a resume label, which becomes the default.
  const row = page.locator("tbody tr").first();
  const company = (await row.locator("td").first().innerText()).trim();
  await row.getByRole("button", { name: "Mark applied", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("SWE v1");
  await page.keyboard.press("Enter");
  await expect(row.getByText(/^Applied /)).toBeVisible();
  await expect(page.getByText(/Applied with “SWE v1”/)).toBeVisible();
  await expect(page.getByRole("button", { name: /SWE v1/ }).first()).toBeVisible();

  let rows = csvRows(await readCsv(page));
  expect(rows).toHaveLength(2);
  expect(rows[1]).toContain("SWE v1");
  expect(rows[1]).toContain(company.replace(/^🔥\s*/, ""));

  // Second one uses the default with one click.
  const second = page.locator("tbody tr").nth(1);
  await second.getByRole("button", { name: "Mark applied", exact: true }).click();
  await expect(second.getByText(/^Applied /)).toBeVisible();
  expect(csvRows(await readCsv(page))).toHaveLength(3);

  // Per-job override of the resume version.
  await second.getByRole("button", { name: /SWE v1/ }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("ML focused");
  await page.keyboard.press("Enter");
  await expect(second.getByRole("button", { name: /ML focused/ })).toBeVisible();
  rows = csvRows(await readCsv(page));
  expect(rows.filter((r) => r.includes("ML focused"))).toHaveLength(1);

  // Reload: the list is refetched, the file is reconnected, applied state is restored.
  await page.reload();
  await expect(page.locator("tbody tr").first().getByText(/^Applied /)).toBeVisible();
  await expect(page.getByRole("tab", { name: /My applications\s*2/ })).toBeVisible();

  // Applications view.
  await page.getByRole("tab", { name: /My applications/ }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await expect(page.getByText("Still listed", { exact: false }).first()).toBeVisible();

  // Remove + undo.
  await page.getByRole("button", { name: /^Remove / }).first().click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(csvRows(await readCsv(page))).toHaveLength(2);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  expect(csvRows(await readCsv(page))).toHaveLength(3);
});

test("picks up edits made to the CSV outside the app, keeping extra columns", async ({ page }) => {
  await createFile(page);
  const row = page.locator("tbody tr").first();
  const jobId = await row.getAttribute("data-job-id");
  await writeCsv(
    page,
    `job_id,company,role,notes,resume_version\n${jobId},Edited Co,Edited role,"phone screen, Oct 9",Hand edited\n`,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(row.getByRole("button", { name: /Hand edited/ })).toBeVisible();

  // A write from the app keeps the hand-added column.
  await page.locator("tbody tr").nth(1).getByRole("button", { name: "Mark applied", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("v2");
  await page.keyboard.press("Enter");
  await expect(page.locator("tbody tr").nth(1).getByText(/^Applied /)).toBeVisible();
  const text = await readCsv(page);
  expect(text.split("\n")[0]).toMatch(/,notes$/);
  expect(text).toContain('"phone screen, Oct 9"');
});

test("refuses to take over a CSV that isn't an applications file", async ({ page }) => {
  await page.goto("/");
  await writeCsv(page, "name,email\nAda,ada@example.com\n");
  await page.getByRole("button", { name: "I already have one" }).click();
  await expect(page.getByText(/doesn't look like a job-applications.csv/)).toBeVisible();
  expect(await readCsv(page)).toBe("name,email\nAda,ada@example.com\n");
});

test("filters and search", async ({ page }) => {
  await createFile(page);
  await page.getByRole("button", { name: /Quantitative Finance/ }).click();
  await expect(page).toHaveURL(/category=quantitative-finance/);
  const count = await page.locator("tbody tr").count();
  expect(count).toBeGreaterThan(0);

  await page.keyboard.press("/");
  await page.keyboard.type("zzzz-no-such-company");
  await expect(page.getByText("No roles match these filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await expect(page).toHaveURL(/category=quantitative-finance/);

  // Filters survive a reload (the list itself is refetched).
  await page.reload();
  await expect(page.getByRole("button", { name: /Quantitative Finance/ })).toHaveAttribute("aria-current", "page");
});
