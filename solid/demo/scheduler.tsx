import { render } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { Toaster } from "../src/toast"
import { DemoPage } from "./demo-page"
import SchedulerTimelineExample from "./examples/scheduler-timeline"
import { SchedulerDemo } from "./kits/scheduler-demo"
import "./kits.css"

// The page's agent, as the site's kit pages have one (window.agent), for its browser tests.
Object.assign(window, { agent: createAgent() })

render(
  () => (
    <DemoPage title="Scheduler in Solid" description="The scheduler kit in Solid 2: a week, a day and a month of events to draw, move and resize, with Undo, and room bookings on a timeline that refuses overlaps, as on the React kit page.">
      <section class="scheduler-stage" aria-labelledby="scheduler-week">
        <h2 id="scheduler-week">Team calendar</h2>
        <SchedulerDemo />
      </section>
      <section class="scheduler-stage" aria-labelledby="scheduler-rooms">
        <h2 id="scheduler-rooms">Room bookings</h2>
        <SchedulerTimelineExample />
      </section>
      <Toaster />
    </DemoPage>
  ),
  document.getElementById("app")!,
)
