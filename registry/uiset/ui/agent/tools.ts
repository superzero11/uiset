import { agentTools, type createAgent } from "@ui-sdk/core/agent"

type Agent = ReturnType<typeof createAgent>
type ToolName = "snapshot" | "query" | "act"

// Route a model's tool call to the bridge. Pair with `agentTools`, which holds the names,
// descriptions and JSON Schemas to hand the model.
async function runAgentTool(agent: Agent, name: string, input: unknown) {
  switch (name as ToolName) {
    case "snapshot":
      return agent.snapshot()
    case "query":
      return agent.query((input ?? {}) as Parameters<Agent["query"]>[0])
    case "act":
      return agent.act(input as Parameters<Agent["act"]>[0])
    default:
      return { error: `Unknown tool "${name}". The tools are snapshot, query and act.` }
  }
}

export { agentTools, runAgentTool }
export type { Agent }
