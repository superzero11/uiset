import { lazy, StrictMode, Suspense, useEffect } from "react"
import { createRoot } from "react-dom/client"
import { UISet } from "@/registry/uiset/ui/uiset"
import "./site/agent"
import { preloadRoute, route, staticPaths } from "./site/routes"
import { SiteLayout } from "./site/shell/layout"
import { setPreloader, useLocation } from "./site/shell/router"
import "./site/site.css"

const BenchPage = lazy(() => import("./site/bench").then((m) => ({ default: m.BenchPage })))

// Pages load on demand, so a link to a section of another page (/kits#studio) arrives before
// the section exists. This sits in the same Suspense boundary as the page, so its effect runs
// once the page has drawn.
function ScrollToHash({ path }: { path: string }) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [path])
  return null
}

function Site() {
  const { pathname } = useLocation()
  // The agent benchmark's bare screens (bench/), outside the site's frame.
  if (pathname.startsWith("/bench/"))
    return (
      <Suspense>
        <BenchPage task={pathname.slice(7)} />
      </Suspense>
    )
  const Page = route(pathname)
  // The social card is screenshotted on its own (scripts/prerender.mjs), without the site's frame.
  if (pathname === "/og")
    return (
      <UISet skin="base" theme="light" className="site">
        <Suspense>
          <Page />
        </Suspense>
      </UISet>
    )
  return (
    <SiteLayout>
      <Suspense fallback={<p className="page-loading">Loading…</p>}>
        <Page />
        <ScrollToHash path={pathname} />
      </Suspense>
    </SiteLayout>
  )
}

// Every page, for the build's prerender (scripts/prerender.mjs) and the sitemap. The docs
// list carries the whole registry, so it loads only when asked.
Object.assign(window, {
  __sitePaths: () => import("./site/docs/nav").then(({ docPages }) => [...staticPaths, ...docPages.map((p) => p.path)]),
})

// The page you arrive on loads before the first render, so it draws whole, in place of
// its prerendered copy, instead of a loading state in between.
setPreloader(preloadRoute)
preloadRoute(window.location.pathname)
  .catch(() => {})
  .then(() =>
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <Site />
      </StrictMode>,
    ),
  )
