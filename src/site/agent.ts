import { createAgent, registerTools } from "@ui-sdk/react/agent"
import { createHistory } from "@ui-sdk/react/history"
import { createApprovals } from "@/registry/uiset/ui/agent/approvals"
import { highlightAgent } from "@/registry/uiset/ui/agent/highlight"

const approvals = createApprovals()
const agent = createAgent({ allow: approvals.allow })

// The bridge's own allow already asks the person, so WebMCP must not ask a second time.
registerTools(agent, { allow: () => true })

// Both watch components as they're created, so they start before the app renders.
highlightAgent()
const history = createHistory(agent, {
  within: () => document.getElementById("project-settings"),
})

// For poking at the bridge from the browser console while developing.
if (import.meta.env.DEV) Object.assign(window, { agent, agentHistory: history })

export { agent, approvals, history }
