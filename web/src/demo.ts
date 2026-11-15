import { createAgent } from "@ui-sdk/web/agent"

// The demo's own script: the skin and theme switches drive <uiset-root>; Delete removes a row.
const root = document.getElementById("root")!
document.getElementById("skin")!.addEventListener("valuechange", (event) => {
  root.setAttribute("skin", String((event as CustomEvent<{ value: string }>).detail.value))
})
document.getElementById("theme")!.addEventListener("valuechange", (event) => {
  root.setAttribute("theme", String((event as CustomEvent<{ value: string }>).detail.value))
})
document.getElementById("messages")!.addEventListener("click", (event) => {
  const action = (event.target as Element).closest(".swipe-action")
  action?.closest("uiset-swipe-row")?.remove()
})

// The stepper's steps; choosing one moves the flow there.
const stepper = document.getElementById("stepper") as HTMLElement & { steps: { value: string; label: string; description?: string }[] }
stepper.steps = [
  { value: "account", label: "Account" },
  { value: "details", label: "Details", description: "Name and region" },
  { value: "review", label: "Review" },
]

// An agent bridge, as an app would make one; the tests drive it as an agent would.
Object.assign(window, { agent: createAgent() })
