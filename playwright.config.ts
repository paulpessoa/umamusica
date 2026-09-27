import { defineConfig, devices } from "@playwright/test";

// PLAYWRIGHT_BASE_URL is set for the post-deploy production smoke test
// (railway-resume-style CI job): tests hit an already-running remote URL,
// so there is nothing to spin up locally — and trying to (npm run dev)
// fails there anyway, since that job has none of the app's env vars
// (SUPABASE_URL, etc). Only start a local dev server when no explicit
// base URL was given, i.e. the default local-dev flow.
const isRemoteTarget = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: isRemoteTarget
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        stdout: "ignore",
        stderr: "pipe",
        timeout: 30000,
        env: {
          GEMINI_API_KEY: "dummy_value",
        },
      },
});
