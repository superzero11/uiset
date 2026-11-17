import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// Each Vite server keeps its pre-bundled dependencies in a folder named for its port. Several
// run in this checkout at once (the dev servers, e2e's, other agent sessions'). In one shared
// folder, a server that re-bundled swapped React's chunks under the others, and their pages
// went blank ("Invalid hook call").
export function cacheDirFor(argv: readonly string[], fallbackPort?: number): string | undefined {
  const at = argv.indexOf("--port")
  const port = at > -1 ? argv[at + 1] : argv.find((arg) => arg.startsWith("--port="))?.slice("--port=".length)
  const name = port ?? fallbackPort
  return name === undefined ? undefined : join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules", `.vite-${name}`)
}
