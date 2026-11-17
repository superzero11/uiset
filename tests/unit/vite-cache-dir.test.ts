import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"
import { cacheDirFor } from "../../scripts/vite-cache-dir"

const dir = (name: string) => join(dirname(fileURLToPath(import.meta.url)), "..", "..", "node_modules", `.vite-${name}`)

test("each Vite server's dependency cache is named for its port", () => {
  expect(cacheDirFor(["node", "vite", "--port", "5631", "--strictPort"])).toBe(dir("5631"))
  expect(cacheDirFor(["node", "vite", "--port=5620"])).toBe(dir("5620"))
  // The web config passes the port it sets for itself.
  expect(cacheDirFor(["node", "vite", "--config", "web/vite.config.ts"], 5640)).toBe(dir("5640"))
  expect(cacheDirFor(["node", "vite", "--config", "web/vite.config.ts", "--port", "5642"], 5640)).toBe(dir("5642"))
  // No port (a build, Vitest): Vite's own default.
  expect(cacheDirFor(["node", "vitest", "run"])).toBeUndefined()
})
