import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { ComponentsGallery, preloadGallery } from "../components-page"
import { InstallCommand } from "../shell/code"
import { useSiteTheme } from "../shell/layout"
import { usePageMeta } from "../shell/meta"
import { SkinPicker, skinValues, useUrlState } from "../shell/skin-picker"

function ComponentsPage() {
  const { theme } = useSiteTheme()
  const [skin, setSkin] = useUrlState<Skin>("skin", skinValues, "base")
  usePageMeta({
    title: "UI SDK components, styled",
    description:
      "All 55 of Vercel's UI SDK components, styled by UISet and installable one by one with the shadcn CLI, plus the app frame, data display and kits. Keyboard, focus and screen reader support come from UI SDK.",
    path: "/components",
  })
  return (
    <div className="page">
      <header className="page-head">
        <h1>Components</h1>
        <p>
          Every UI SDK component, styled and installable on its own, plus the app frame, data display parts and kits. They use UI SDK&rsquo;s own parts and names, so its docs apply as
          they are. Open any one for its usage and code.
        </p>
        <InstallCommand items={["uiset", "button", "field", "select"]} label="Install the root and a few components" />
        <div className="page-controls">
          <SkinPicker value={skin} onChange={setSkin} />
        </div>
      </header>
      <UISet skin={skin} theme={theme} className="components-surface">
        <ComponentsGallery />
      </UISet>
    </div>
  )
}

// The router waits for the first examples, so they draw with the page.
const preload = () => preloadGallery()

export default ComponentsPage
export { preload }
