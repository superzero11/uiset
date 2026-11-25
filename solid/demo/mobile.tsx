import { render } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { Toaster } from "../src/toast"
import { DemoPage } from "./demo-page"
import MobileExample from "./examples/mobile"
import "./kits.css"

// The page's agent, as the site's kit pages have one (window.agent), for its browser tests.
Object.assign(window, { agent: createAgent() })

render(
  () => (
    <DemoPage title="Mobile in Solid" description="The mobile kit in Solid 2: an inbox whose rows swipe aside to their actions and that you pull to refresh, alarms set on wheels in a bottom sheet, an action sheet, a sheet with two resting heights, and a tab bar, as on the React kit page.">
      <div class="mobile-stage">
        <MobileExample />
      </div>
      <Toaster />
    </DemoPage>
  ),
  document.getElementById("app")!,
)
