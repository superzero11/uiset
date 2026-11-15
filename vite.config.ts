import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Pre-bundle every UI SDK entry at startup. Discovering one mid-session makes Vite
// re-bundle and briefly serve a second copy of React.
const require = createRequire(import.meta.url)
const entries = (pkg: string) =>
  Object.keys(
    JSON.parse(readFileSync(require.resolve(`${pkg}/package.json`), "utf8"))
      .exports as object,
  )
    .filter((key) => key !== "./package.json" && !key.endsWith(".css"))
    .map((key) => (key === "." ? pkg : `${pkg}/${key.slice(2)}`))

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      ...entries("@ui-sdk/react"),
      ...entries("@ui-sdk/core").filter((e) => !e.endsWith("/testing")),
    ],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
})
