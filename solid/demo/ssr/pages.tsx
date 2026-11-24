import type { JSX } from "@solidjs/web"
import { createSignal } from "solid-js"
import { Button } from "@ui-sdk/solid/button"
import { Field, FieldLabel } from "@ui-sdk/solid/field"
import { Input } from "@ui-sdk/solid/input"
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from "@ui-sdk/solid/segmented-control"
import { Switch, SwitchThumb } from "@ui-sdk/solid/switch"
import { UISet, type Skin } from "../../src/uiset"
import { Components } from "../components-page"
import { DemoPage } from "../demo-page"
import { ChatDemo } from "../kits/chat-demo"
import { EditorDemo } from "../kits/editor-demo"
import { GridDemo } from "../kits/grid-demo"
import "../kits.css"
import "../demo.css"

// Pages the server renders and the browser hydrates (/ssr/<name>). Each item adds its own as
// it comes to Solid, so its hydration is checked in a real browser.

function Root() {
  const [skin, setSkin] = createSignal<Skin>("base")
  const [saved, setSaved] = createSignal(0)
  return (
    <UISet skin={skin()} class="solid-demo-root" keyColor={{ l: 0.55, c: 0.18, h: 265 }}>
      <main class="web-demo">
        <h1>The root, server-rendered</h1>
        <SegmentedControl value={skin()} onValueChange={(value) => setSkin(value as Skin)} aria-label="Skin">
          <SegmentedControlIndicator />
          <SegmentedControlItem value="base">Base</SegmentedControlItem>
          <SegmentedControlItem value="ink">Ink</SegmentedControlItem>
        </SegmentedControl>
        <Field>
          <FieldLabel>Workspace name</FieldLabel>
          <Input placeholder="Acme" />
        </Field>
        <label class="web-row">
          <Switch>
            <SwitchThumb />
          </Switch>
          Email me a weekly summary
        </label>
        <Button onClick={() => setSaved((n) => n + 1)}>Save</Button>
        <p role="status">{saved() ? `Saved ${saved()} ${saved() === 1 ? "time" : "times"}` : "Not saved"}</p>
      </main>
    </UISet>
  )
}

function Chat() {
  return (
    <DemoPage title="Chat in Solid" description="The chat kit, rendered on the server.">
      <div class="chat-stage">
        <ChatDemo />
      </div>
    </DemoPage>
  )
}

function RichText() {
  return (
    <DemoPage title="Rich text in Solid" description="The rich text kit, rendered on the server.">
      <div class="rich-text-stage">
        <EditorDemo />
      </div>
    </DemoPage>
  )
}

function Grid() {
  return (
    <DemoPage title="Data grid in Solid" description="The data grid kit, rendered on the server.">
      <div class="grid-stage">
        <GridDemo />
      </div>
    </DemoPage>
  )
}

const pages: Record<string, () => JSX.Element> = { root: Root, components: Components, chat: Chat, "rich-text": RichText, "data-grid": Grid }

export { pages }
