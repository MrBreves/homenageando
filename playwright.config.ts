import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/demo",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://demo-test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo-test-key",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
      ADMIN_USER_ID: "test-admin",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
