// The Terminal page's own script: the gallery's commands, with Up bringing back `ls`.
import { createAgent } from "@ui-sdk/web/agent"
import { commands } from "@/src/site/terminal-commands"
import type { TerminalElement } from "./terminal"

const shell = document.getElementById("shell") as TerminalElement
shell.commands = commands
shell.history = ["ls"]

Object.assign(window, { agent: createAgent() })
