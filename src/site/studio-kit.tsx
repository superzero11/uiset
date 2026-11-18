import { useRef } from "react"
import { AgentPanel } from "./agent-panel"
import { studioScript } from "./scripts"
import { StudioDevice, synth } from "./studio-device"

// The Studio kit's demo: the rack, and prompts an agent plays it by, through the bridge.
function StudioKit() {
  const rack = useRef<HTMLDivElement>(null)
  return (
    <>
      <div ref={rack}>
        <StudioDevice />
      </div>
      <AgentPanel within={rack} script={studioScript} showSnapshot={false} beforeRun={() => synth.unlock()} />
    </>
  )
}

export { StudioKit }
