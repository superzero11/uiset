import { render } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { DemoPage } from "./demo-page"
import { GridDemo } from "./kits/grid-demo"
import "./kits.css"

// The page's agent, as the site's kit pages have one (window.agent), for its browser tests.
Object.assign(window, { agent: createAgent() })

render(
  () => (
    <DemoPage title="Data grid in Solid" description="The data grid kit in Solid 2: ten thousand orders, sorting, filters, grouping, pinned and movable columns, inline editing and a saved layout, as on the React kit page.">
      <div class="grid-stage">
        <GridDemo />
      </div>
    </DemoPage>
  ),
  document.getElementById("app")!,
)
