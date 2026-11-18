import { ConsoleDemo } from "./console-demo"
import { ProjectSettings } from "./project-settings"

// The Agent Console kit's demo: the project settings an agent changes, beside the console you
// steer it from. The console finds the settings by their id, as on the Agents page.
function ConsoleKit() {
  return (
    <div className="console-stage">
      <div className="console-target">
        <ProjectSettings />
      </div>
      <ConsoleDemo />
    </div>
  )
}

export { ConsoleKit }
