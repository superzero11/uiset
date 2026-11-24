import { generateHydrationScript, renderToString } from "@solidjs/web"
import { pages } from "./pages"

/** A page's HTML from the server, with Solid's hydration script; null for no such page. */
export function render(name: string) {
  const Page = pages[name]
  if (!Page) return null
  return { head: generateHydrationScript(), body: renderToString(() => <Page />) }
}
