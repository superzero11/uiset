import { render } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { DemoPage } from "./demo-page"
import TerminalExample from "./examples/terminal"
import "./kits.css"

// The page's agent, as the site's kit pages have one (window.agent), for its browser tests.
Object.assign(window, { agent: createAgent() })

render(
  () => (
    <DemoPage title="Terminal in Solid" description="The terminal kit in Solid 2: ANSI colors kept readable in every skin, links, commands that stream with a spinner and a progress bar, Tab completion, history, Ctrl+C and Ctrl+L, as on the React kit page.">
      <div class="terminal-stage">
        <TerminalExample />
      </div>
    </DemoPage>
  ),
  document.getElementById("app")!,
)
