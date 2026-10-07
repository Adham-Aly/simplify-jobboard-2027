import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:2027",
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chromium", viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:2027",
    reuseExistingServer: true,
  },
});
