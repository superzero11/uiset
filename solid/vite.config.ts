import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import solid from "@solidjs/vite-plugin"
import { defineConfig, type Plugin } from "vite"
import { cacheDirFor } from "../scripts/vite-cache-dir.ts"

// UISet for Solid 2: the same CSS and shared TypeScript as the React registry and the Web
// Components build, with views written in Solid on UI SDK's @ui-sdk/solid.

const root = fileURLToPath(new URL(".", import.meta.url))

// /ssr/<page>: the page rendered on the server, then hydrated in the browser, as SolidStart
// does. `ssr: true` compiles the client hydratable, so the other pages still mount with render().
const serverRendered = (): Plugin => ({
  name: "uiset-solid-ssr",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? "/", "http://localhost")
      const page = /^\/ssr\/([\w-]+)$/.exec(url.pathname)?.[1]
      if (!page) return next()
      void (async () => {
        const { render } = (await server.ssrLoadModule("/demo/ssr/server.tsx")) as { render: (page: string) => { head: string; body: string } | null }
        const rendered = render(page)
        if (!rendered) return next()
        const shell = readFileSync(`${root}/demo/ssr/index.html`, "utf8")
          .replace("<!--head-->", rendered.head)
          .replace("<!--page-->", page)
          .replace("<!--body-->", rendered.body)
        res.setHeader("content-type", "text/html")
        res.end(await server.transformIndexHtml(url.pathname, shell))
      })().catch((error: Error) => {
        server.ssrFixStacktrace(error)
        next(error)
      })
    })
  },
})

export default defineConfig({
  root,
  cacheDir: cacheDirFor(process.argv, 5650),
  plugins: [solid({ ssr: true }), serverRendered()],
  server: { port: 5650, strictPort: true },
  preview: { port: 5651, strictPort: true },
  // UI SDK's Solid docs: pre-bundled apart, a core entry the page imports is a second copy of
  // the one @ui-sdk/solid loads, and its components throw in development.
  optimizeDeps: { exclude: ["@ui-sdk/core"] },
  resolve: { alias: { "@": fileURLToPath(new URL("..", import.meta.url)) } },
})
