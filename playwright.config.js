const { defineConfig } = require("@playwright/test");

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8765";

module.exports = defineConfig({
  testDir: "./tests",
  // Playwright owns *.spec.js; Node's runner owns *.test.js (unit tests). Keeping
  // them separate stops `playwright test` from loading node:test files.
  testMatch: "**/*.spec.js",
  timeout: 30 * 1000,
  expect: { timeout: 7 * 1000 },
  use: {
    baseURL,
    viewport: { width: 1280, height: 900 },
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "node scripts/server.js",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 15 * 1000,
  },
});
