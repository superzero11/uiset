import { lazy, type ComponentType, type LazyExoticComponent } from "react"

// The site's pages by path. Each page's code loads when it's first needed: before the first
// render for the page you arrive on, and before the address changes for the next one, so
// neither shows a loading state. A page module may export `preload(pathname)` to fetch its
// content too (the docs load their Markdown).

type PageModule = { default: ComponentType; preload?: (pathname: string) => Promise<unknown> }

const loaders = {
  home: () => import("./pages/home"),
  docs: () => import("./pages/docs"),
  components: () => import("./pages/components"),
  kits: () => import("./pages/kits"),
  templates: () => import("./pages/templates"),
  themes: () => import("./pages/themes"),
  generator: () => import("./pages/generator"),
  agents: () => import("./pages/agents"),
  notFound: () => import("./pages/not-found"),
  og: () => import("./pages/og"),
} satisfies Record<string, () => Promise<PageModule>>
type Key = keyof typeof loaders

const loaded = new Map<Key, ComponentType>()
const lazies = Object.fromEntries(
  Object.entries(loaders).map(([key, load]) => [key, lazy(load as () => Promise<PageModule>)]),
) as unknown as Record<Key, LazyExoticComponent<ComponentType>>

function keyOf(pathname: string): Key {
  const path = pathname.replace(/\/+$/, "") || "/"
  if (path === "/") return "home"
  if (path === "/docs" || path.startsWith("/docs/")) return "docs"
  if (path === "/components") return "components"
  if (path === "/kits") return "kits"
  if (path === "/templates") return "templates"
  if (path === "/themes") return "themes"
  if (path === "/themes/generator" || path === "/theme") return "generator"
  if (path === "/agents") return "agents"
  if (path === "/og") return "og"
  return "notFound"
}

/** The page for a path: the loaded component once its code is in, otherwise a lazy one. */
function route(pathname: string): ComponentType {
  const key = keyOf(pathname)
  return loaded.get(key) ?? lazies[key]
}

/** Loads a page's code, and its content when it says how. */
async function preloadRoute(pathname: string) {
  const key = keyOf(pathname)
  const page: PageModule = await loaders[key]()
  loaded.set(key, page.default)
  await page.preload?.(pathname)
}

/** Every page the build renders ahead of time (docs pages come from the docs list). */
const staticPaths = ["/", "/components", "/kits", "/templates", "/themes", "/themes/generator", "/agents"]

export { preloadRoute, route, staticPaths }
