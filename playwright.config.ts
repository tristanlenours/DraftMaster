import { defineConfig } from "@playwright/test";

const port = 4173;

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node --no-warnings --experimental-strip-types scripts/serve-web.mjs",
    env: {
      NODE_ENV: "test",
      PORT: String(port),
      SITE_PASSWORD: "",
    },
    reuseExistingServer: false,
    timeout: 30_000,
    url: `http://127.0.0.1:${String(port)}/health`,
  },
});
