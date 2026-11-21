import { defineConfig, devices } from "@playwright/test"

const port = 5631
// UISet for Web Components runs from its own server: plain HTML, no React.
const webPort = 5642

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "web/**",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
      },
    },
    {
      name: "web",
      testMatch: "web/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.CI ? undefined : "chrome",
        baseURL: `http://localhost:${webPort}`,
      },
    },
    // Safari's engine and Firefox run the tests tagged @engine: what can differ between
    // engines (layout, CSS, contrast, motion, scrolling) and the keys and pointer of the kits
    // whose input UISet wrote itself. Behavior runs through the agent bridge in Vitest, and
    // the rest in Chrome (design/bridge-testing-plan.md).
    { name: "webkit", testIgnore: "web/**", grep: /@engine/, use: { ...devices["Desktop Safari"] } },
    { name: "firefox", testIgnore: "web/**", grep: /@engine/, use: { ...devices["Desktop Firefox"] } },
    { name: "web-webkit", testMatch: "web/**/*.spec.ts", grep: /@engine/, use: { ...devices["Desktop Safari"], baseURL: `http://localhost:${webPort}` } },
    { name: "web-firefox", testMatch: "web/**/*.spec.ts", grep: /@engine/, use: { ...devices["Desktop Firefox"], baseURL: `http://localhost:${webPort}` } },
  ],
  webServer: [
    {
      command: `pnpm vite --port ${port} --strictPort`,
      url: `http://localhost:${port}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm vite --config web/vite.config.ts --port ${webPort} --strictPort`,
      url: `http://localhost:${webPort}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
