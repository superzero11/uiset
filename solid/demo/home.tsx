import { render } from "@solidjs/web"
import { Button } from "@ui-sdk/solid/button"
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/solid/field"
import { Input } from "@ui-sdk/solid/input"
import { Switch, SwitchThumb } from "@ui-sdk/solid/switch"
import { DemoPage } from "./demo-page"

function Home() {
  return (
    <DemoPage title="UISet for Solid" description="The UISet root in Solid 2, dressing UI SDK's own Solid parts in every skin.">
      <nav class="web-demo-pages" aria-label="Pages">
        <div>
          <h2>In Solid so far</h2>
          <ul>
            <li>
              <a href="./components.html">Components</a>
            </li>
            <li>
              <a href="./chat.html">Chat</a>
            </li>
            <li>
              <a href="./rich-text.html">Rich text</a>
            </li>
            <li>
              <a href="./data-grid.html">Data grid</a>
            </li>
            <li>
              <a href="./board.html">Board</a>
            </li>
            <li>
              <a href="./ssr/root">The root, server-rendered</a>
            </li>
          </ul>
        </div>
      </nav>
      <div class="web-demo-grid">
        <article aria-labelledby="root-parts">
          <h2 id="root-parts">UI SDK's parts in the root</h2>
          <Field>
            <FieldLabel>Workspace name</FieldLabel>
            <Input placeholder="Acme" />
            <FieldDescription>Shown to everyone you invite.</FieldDescription>
          </Field>
          <label class="web-row">
            <Switch defaultChecked>
              <SwitchThumb />
            </Switch>
            Email me a weekly summary
          </label>
          <Button>Save</Button>
        </article>
      </div>
    </DemoPage>
  )
}

render(() => <Home />, document.getElementById("app")!)
