import type { AgentStep } from "@ui-sdk/react/agent"

// A stand-in for a model, so the demo runs without an API key. It turns a sentence into
// bridge steps with a few patterns. Everything it triggers (the bridge, approvals,
// history, undo) is the real thing; a real model would call the same tools.

type Plan =
  | { kind: "act"; steps: { say: string; step: AgentStep }[] }
  | { kind: "undo" }
  | { kind: "look" }
  | { kind: "help" }

const regions: [RegExp, string][] = [
  [/\b(us|usa|united states|america|north america)\b/i, "North America"],
  [/\b(eu|europe|european)\b/i, "Europe"],
  [/\b(asia|apac|asia pacific|japan|singapore)\b/i, "Asia Pacific"],
]

function clause(text: string): { say: string; step: AgentStep }[] {
  const steps: { say: string; step: AgentStep }[] = []
  const lower = text.toLowerCase()
  // "Deploy on push" holds the word "on", so read on and off without it.
  const plain = lower.replace(/deploy(s)? on push/g, "deploy")
  const on = /\b(on|enable|start|turn on|switch on|yes)\b/.test(plain)
  const off = /\b(off|disable|stop|turn off|switch off|no)\b/.test(plain)

  const name = text.match(
    /(?:rename|call|name)\s+(?:it|the project|this)?\s*(?:to|as)?\s*["“']?([^"”']{1,40}?)["”']?\s*$/i,
  )
  if (name?.[1]) {
    steps.push({
      say: `Rename the project to “${name[1].trim()}”`,
      step: { ref: "Project name", action: "setValue", args: [name[1].trim()] },
    })
  }

  const visibility = lower.match(/\b(public|private|internal)\b/)
  if (visibility) {
    const label = visibility[1]![0]!.toUpperCase() + visibility[1]!.slice(1)
    steps.push({
      say: `Make it ${visibility[1]}`,
      step: { ref: "Visibility", action: "setValue", args: [label] },
    })
  }

  for (const [pattern, label] of regions) {
    if (pattern.test(text) && /\b(region|move|host|deploy to|run in|in)\b/i.test(text)) {
      steps.push({
        say: `Move it to ${label}`,
        step: { ref: "Region", action: "setValue", args: [label] },
      })
      break
    }
  }

  if (/digest|email|newsletter/.test(lower) && (on || off)) {
    steps.push({
      say: `Turn the weekly digest ${off && !on ? "off" : "on"}`,
      step: { ref: "Weekly digest", action: "setChecked", args: [!(off && !on)] },
    })
  }

  if (/deploy|push|ship/.test(lower) && (on || off) && !/deploy to/.test(lower)) {
    steps.push({
      say: `Turn deploy on push ${off && !on ? "off" : "on"}`,
      step: { ref: "Deploy on push", action: "setChecked", args: [!(off && !on)] },
    })
  }

  if (/\bsave\b/.test(lower)) {
    steps.push({
      say: "Save the project",
      step: { ref: "Save project", action: "press" },
    })
  }

  if (/\b(delete|remove|destroy)\b/.test(lower)) {
    steps.push({
      say: "Delete the project",
      step: { ref: "Delete project", action: "press", args: ["Delete forever"] },
    })
  }

  return steps
}

function plan(text: string): Plan {
  const lower = text.toLowerCase()
  if (/\b(undo|revert|put (it|them|that|everything) back|roll back)\b/.test(lower))
    return { kind: "undo" }
  if (/\b(what can you (see|do)|what do you see|look)\b/.test(lower))
    return { kind: "look" }
  const steps = text.split(/,|;|\band then\b|\bthen\b|\band\b/i).flatMap(clause)
  return steps.length ? { kind: "act", steps } : { kind: "help" }
}

export { plan }
export type { Plan }
