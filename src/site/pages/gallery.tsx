import { UISet } from "@/registry/uiset/ui/uiset"
import { ComponentsGallery, preloadGallery } from "../components-page"
import { useSiteTheme } from "../shell/layout"
import { usePageMeta } from "../shell/meta"
import { useSkin } from "../shell/skin-picker"

// Every component example on one page, live: to try them side by side in the site's skin.
// The library's Components tab shows them as cards; each one's page has its own.

function GalleryPage() {
  const { theme } = useSiteTheme()
  const [skin] = useSkin()
  usePageMeta({
    title: "Every UI SDK component, live",
    description: "Every UISet example on one page, live in the skin you choose: the 55 UI SDK components and the app frame, data display and form parts.",
    path: "/gallery",
  })
  return (
    <article className="docs-main" data-wide="" aria-labelledby="docs-title">
      <header className="docs-head">
        <nav className="docs-crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="/components">Components</a>
            </li>
            <li aria-current="page">All, live</li>
          </ol>
        </nav>
        <h1 id="docs-title">Every component, live</h1>
        <p className="docs-lede">Each example works as it does on its page: try them side by side, in any skin, light or dark.</p>
      </header>
      <UISet skin={skin} theme={theme} className="components-surface">
        <ComponentsGallery />
      </UISet>
    </article>
  )
}

const preload = () => preloadGallery()

export default GalleryPage
export { preload }
