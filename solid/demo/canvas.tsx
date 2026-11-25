import { render } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { DemoPage } from "./demo-page"
import CanvasExample from "./examples/canvas"
import "./kits.css"

// The page's agent, as the site's kit pages have one (window.agent), for its browser tests.
Object.assign(window, { agent: createAgent() })

render(
  () => (
    <DemoPage title="Canvas in Solid" description="The canvas kit in Solid 2: an agent workflow of nodes and wires to pan, zoom, move, select and wire by pointer, keyboard and agent, with undo, a minimap, a toolbar and an inspector, as on the React kit page.">
      <div class="canvas-stage">
        <CanvasExample />
      </div>
    </DemoPage>
  ),
  document.getElementById("app")!,
)
