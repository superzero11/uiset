import { render } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { DemoPage } from "./demo-page"
import { EditorDemo } from "./kits/editor-demo"
import "./kits.css"

// The page's agent, as the site's kit pages have one (window.agent), for its browser tests.
Object.assign(window, { agent: createAgent() })

render(
  () => (
    <DemoPage title="Rich text in Solid" description="The rich text kit in Solid 2: Markdown as you type, a toolbar, / for blocks and @ for people, as on the React kit page.">
      <div class="rich-text-stage">
        <EditorDemo />
      </div>
    </DemoPage>
  ),
  document.getElementById("app")!,
)
