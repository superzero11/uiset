import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

// UISet for Web Components: the same CSS and primitives as the React registry, built into
// one module and one stylesheet for any page or framework (Vue, Svelte, Solid, plain HTML).
const require = createRequire(import.meta.url)
const entries = (pkg: string) =>
  Object.keys(JSON.parse(readFileSync(require.resolve(`${pkg}/package.json`), "utf8")).exports as object)
    .filter((key) => key !== "./package.json" && !key.endsWith(".css") && !key.endsWith(".json") && !key.includes("*"))
    .map((key) => (key === "." ? pkg : `${pkg}/${key.slice(2)}`))

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  server: { port: 5640, strictPort: true },
  preview: { port: 5641, strictPort: true },
  optimizeDeps: {
    include: [...entries("@ui-sdk/web"), ...entries("@ui-sdk/core").filter((e) => !e.endsWith("/testing"))],
  },
  resolve: { alias: { "@": fileURLToPath(new URL("..", import.meta.url)) } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL("src/uiset.ts", import.meta.url)),
      formats: ["es"],
      fileName: "uiset",
      cssFileName: "uiset",
    },
    // UI SDK stays a peer: pages bring one copy of it for every component.
    // UI SDK and shiki stay peers: pages bring one copy of each. Without shiki, code blocks in
    // chats are plain text.
    rollupOptions: { external: [/^@ui-sdk\//, /^shiki/] },
  },
})
