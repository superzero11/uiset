import { Button } from "@/registry/uiset/ui/button"
import { Slider } from "@/registry/uiset/ui/slider"
import { Switch } from "@/registry/uiset/ui/switch"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { facts } from "../facts"
import { LogoMark } from "../shell/logo"
import { usePageMeta } from "../shell/meta"
import { skins } from "../shell/skin-picker"

// The social card (1200×630) the build screenshots to og.png. Not a page people visit.
// The same three controls in every skin: one set of components, five looks.
const dark: Partial<Record<Skin, "dark">> = { studio: "dark", phosphor: "dark" }

function OgPage() {
  usePageMeta({ title: "UISet social card", description: "The image shown when UISet is shared.", path: "/og" })
  return (
    <div className="og-card">
      <div className="og-copy">
        <div className="og-brand">
          <LogoMark size={56} />
          <span>UISet</span>
        </div>
        <p className="og-title">Components, kits, templates and themes for Vercel&rsquo;s UI&nbsp;SDK</p>
        <p className="og-facts">
          {facts.sdkComponents} components, {facts.kits.length}&nbsp;kits, {facts.templates}&nbsp;templates, {facts.skins}&nbsp;skins
        </p>
      </div>
      <div className="og-skins" inert aria-hidden="true">
        {skins.map(({ value, label }) => (
          <UISet key={value} skin={value} theme={dark[value] ?? "light"} className="og-skin">
            <span className="og-skin-name">{label}</span>
            <Switch defaultChecked aria-label="On" />
            <Slider defaultValue={64} aria-label="Level" />
            <Button>Save</Button>
          </UISet>
        ))}
      </div>
    </div>
  )
}

export default OgPage
