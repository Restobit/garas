import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tesztek: futó stack kell hozzájuk (docker compose up, vagy lokálisan
 * futó backend + mongo + vite dev szerver). Clerk kulcs nélkül a backend
 * fejlesztői auth módban fut, így a tesztek bejelentkezés nélkül mennek.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile/ },
  ],
});
