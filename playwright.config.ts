import { defineConfig, devices } from "@playwright/test";

// Hydration and cross-engine markup checks in Chromium and WebKit (AD-016; graph-library CPSE
// TICKET-004). No web server: each spec builds its page with `page.setContent` and injects one
// browser bundle of the package's React entry and React (tests/e2e/bundle.ts).
// @spec CPSE-NFR-005
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: 0,
  reporter: process.env.CI !== undefined ? [["list"], ["github"]] : "list",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
