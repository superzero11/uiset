import { render } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { Toaster } from "../src/toast"
import { DemoPage } from "./demo-page"
import BoardExample from "./examples/board"
import "./kits.css"

// The page's agent, as the site's kit pages have one (window.agent), for its browser tests.
Object.assign(window, { agent: createAgent() })

render(
  () => (
    <DemoPage title="Board in Solid" description="The board kit in Solid 2: columns with limits, keyboard and pointer moves with Undo, search and a person filter, adding cards, and a card dialog that edits, moves and deletes, as on the React kit page.">
      <div class="board-stage">
        <BoardExample />
      </div>
      <Toaster />
    </DemoPage>
  ),
  document.getElementById("app")!,
)
