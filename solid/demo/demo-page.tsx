import type { JSX } from "@solidjs/web"
import { createSignal } from "solid-js"
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from "@ui-sdk/solid/segmented-control"
import { UISet, type Skin } from "../src/uiset"
import "./demo.css"

const skins: { value: Skin; label: string }[] = [
  { value: "base", label: "Base" },
  { value: "blueprint", label: "Blueprint" },
  { value: "studio", label: "Studio" },
  { value: "phosphor", label: "Phosphor" },
  { value: "ink", label: "Ink" },
]
type Theme = "system" | "light" | "dark"

/** A demo page's frame: the root, its heading, and the skin and theme it shows in (from `?skin=` and `?theme=`). */
function DemoPage(props: { title: string; description: string; children: JSX.Element }) {
  // On the server there's no address: the page renders in Base and the system theme.
  const query = new URLSearchParams(typeof location === "undefined" ? "" : location.search)
  const [skin, setSkin] = createSignal<Skin>(query.get("skin") ?? "base")
  const [theme, setTheme] = createSignal<Theme>((query.get("theme") as Theme | null) ?? "system")
  return (
    <UISet skin={skin()} theme={theme()} id="root" class="solid-demo-root">
      <main class="web-demo">
        <header class="web-demo-head">
          <h1>{props.title}</h1>
          <p>{props.description}</p>
          <SegmentedControl value={skin()} onValueChange={(value) => setSkin(value as Skin)} aria-label="Skin">
            <SegmentedControlIndicator />
            {skins.map((s) => (
              <SegmentedControlItem value={s.value}>{s.label}</SegmentedControlItem>
            ))}
          </SegmentedControl>
          <SegmentedControl value={theme()} onValueChange={(value) => setTheme(value as Theme)} aria-label="Theme">
            <SegmentedControlIndicator />
            <SegmentedControlItem value="system">System</SegmentedControlItem>
            <SegmentedControlItem value="light">Light</SegmentedControlItem>
            <SegmentedControlItem value="dark">Dark</SegmentedControlItem>
          </SegmentedControl>
        </header>
        {props.children}
      </main>
    </UISet>
  )
}

export { DemoPage }
