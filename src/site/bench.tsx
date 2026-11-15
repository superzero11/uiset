import { UISet } from "@/registry/uiset/ui/uiset"
import { GridDemo } from "./grid-demo"
import { ProjectSettings } from "./project-settings"
import { SchedulerDemo } from "./scheduler-demo"

// One screen per benchmark task (bench/), with nothing else on the page, so neither the
// browser tools nor the agent bridge read anything unrelated. Not linked from the site.
const screens: Record<string, () => React.ReactNode> = {
  settings: () => <ProjectSettings />,
  grid: () => <GridDemo />,
  scheduler: () => <SchedulerDemo />,
}

function BenchPage({ task }: { task: string }) {
  const screen = screens[task]
  return (
    <UISet skin="base" theme="light" className="site bench-page">
      <main id="main" style={{ padding: "1.5rem", maxWidth: "76rem", margin: "0 auto" }}>
        {screen ? screen() : <p>No benchmark screen called {task}.</p>}
      </main>
    </UISet>
  )
}

export { BenchPage }
