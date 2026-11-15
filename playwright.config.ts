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
    // Safari's engine and Firefox: the same tests, so popovers in the top layer, :has(),
    // view transitions and focus behave the same in every evergreen browser UI SDK supports.
    { name: "webkit", testIgnore: "web/**", use: { ...devices["Desktop Safari"] } },
    { name: "firefox", testIgnore: "web/**", use: { ...devices["Desktop Firefox"] } },
    { name: "web-webkit", testMatch: "web/**/*.spec.ts", use: { ...devices["Desktop Safari"], baseURL: `http://localhost:${webPort}` } },
    { name: "web-firefox", testMatch: "web/**/*.spec.ts", use: { ...devices["Desktop Firefox"], baseURL: `http://localhost:${webPort}` } },
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
