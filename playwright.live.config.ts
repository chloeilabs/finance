/**
 * Playwright configuration for live browser smoke tests.
 *
 * Unlike the default config this does NOT start a local dev server —
 * the target environment must already be running.  Point
 * PLAYWRIGHT_BASE_URL at the deployment you want to test:
 *
 *   PLAYWRIGHT_BASE_URL=https://staging.example.com pnpm test:e2e:live
 */

import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  testMatch: "live.smoke.spec.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: {
      width: 1440,
      height: 960,
    },
  },
  // No webServer — the target environment is expected to be running already.
})
