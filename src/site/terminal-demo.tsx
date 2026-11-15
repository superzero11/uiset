import { Terminal } from "@/registry/uiset/ui/terminal"
import { commands } from "./terminal-commands"

function TerminalDemo() {
  return (
    <Terminal
      label="Shell"
      prompt="~/greeter $"
      commands={commands}
      welcome={"Welcome. Type help for the commands; Tab completes, Up brings back the last one."}
      defaultHistory={["ls"]}
    />
  )
}

export { TerminalDemo }
