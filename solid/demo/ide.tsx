import { render } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { IdeTemplate } from "../src/templates/ide-app"
import { DemoPage } from "./demo-page"
import "./kits.css"

// The page's agent, as the site's kit pages have one (window.agent), for its browser tests.
Object.assign(window, { agent: createAgent() })

render(
  () => (
    <DemoPage title="IDE in Solid" description="The IDE kit in Solid 2, in its app template: files with version control marks, tabs, an editor with syntax colors and its own undo, a command palette, problems, an outline and a status bar, as on the React kit page.">
      <div class="ide-stage">
        <IdeTemplate headingLevel={2} />
      </div>
    </DemoPage>
  ),
  document.getElementById("app")!,
)
