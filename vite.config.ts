import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

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

// Vercel serves api/ as functions. Under `pnpm dev` the same handlers answer here, so the
// site's pages that call them work locally.
const api = (): Plugin => ({
  name: "uiset-api",
  configureServer(server) {
    server.middlewares.use("/api/agent-check", (req, res, next) => {
      void (async () => {
        const { GET } = (await server.ssrLoadModule("/api/_agent-check/handler.ts")) as { GET: (request: Request) => Promise<Response> }
        const headers = new Headers()
        for (const [name, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(name, value)
        const response = await GET(new Request(`http://${req.headers.host}${req.originalUrl}`, { headers }))
        res.statusCode = response.status
        response.headers.forEach((value, name) => res.setHeader(name, value))
        res.end(await response.text())
      })().catch(next)
    })
  },
})

export default defineConfig({
  plugins: [react(), api()],
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
