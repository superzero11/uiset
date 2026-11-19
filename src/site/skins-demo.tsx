import { useId } from "react"
import { Button } from "@/registry/uiset/ui/button"
import { Field, FieldLabel, Input, Label } from "@/registry/uiset/ui/field"
import { SegmentedControl, SegmentedControlItem } from "@/registry/uiset/ui/segmented-control"
import { Slider } from "@/registry/uiset/ui/slider"
import { Switch } from "@/registry/uiset/ui/switch"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"

const skins: { value: Skin; name: string; what: string }[] = [
  { value: "base", name: "Base", what: "Takes your shadcn theme, builds one from a key color, or is black and white." },
  { value: "blueprint", name: "Blueprint", what: "A technical drawing: cyanotype paper, linework and hatching." },
  { value: "studio", name: "Studio", what: "A synth rack: gunmetal panels, rubber pads and amber lamps." },
  { value: "phosphor", name: "Phosphor", what: "A green-screen terminal: intensity, inverse video, scan lines." },
  { value: "ink", name: "Ink", what: "E-paper: ink on grey, dotted greys, a reading serif, no motion." },
]

/** The sample form: a picture of a skin, out of the keyboard's and screen readers' way. */
function SkinSample() {
  const eq = useId()
  return (
    <>
      {/* A picture of the skin: the form above is the one to use, so these stay out of the
          way of the keyboard and screen readers instead of repeating its fields five times. */}
      <form className="skins-demo-form" inert aria-hidden="true" onSubmit={(event) => event.preventDefault()}>
        <Field>
          <FieldLabel>Device name</FieldLabel>
          <Input defaultValue="Living room" autoComplete="off" />
        </Field>
        <Field>
          <FieldLabel>Volume</FieldLabel>
          <Slider defaultValue={64} showValue />
        </Field>
        <div className="skins-demo-row">
          <Label htmlFor={eq}>Sound</Label>
          <SegmentedControl id={eq} defaultValue="warm">
            <SegmentedControlItem value="flat">Flat</SegmentedControlItem>
            <SegmentedControlItem value="warm">Warm</SegmentedControlItem>
          </SegmentedControl>
        </div>
        <Field className="skins-demo-row">
          <FieldLabel>Night mode</FieldLabel>
          <Switch defaultChecked />
        </Field>
        <div className="skins-demo-actions">
          <Button type="submit">Save</Button>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </form>
    </>
  )
}

/** The same small form in every skin: one set of components, five looks. */
function SkinsDemo({ theme }: { theme: "system" | "light" | "dark" }) {
  return (
    // A showcase for people; agents work with the real forms elsewhere on the page.
    <ul className="skins-demo" data-agent-hidden="">
      {skins.map((skin) => (
        <li key={skin.value}>
          <UISet skin={skin.value} theme={skin.value === "base" ? theme : undefined} className="skins-demo-card">
            <h3>{skin.name}</h3>
            <p className="skins-demo-what">{skin.what}</p>
            <SkinSample />
          </UISet>
        </li>
      ))}
    </ul>
  )
}

export { SkinSample, SkinsDemo }
