// The benchmark's tasks: what the agent is asked, the screen it works on, and how the harness
// checks the result in the page afterwards (the agent never sees the check).

const tasks = [
  {
    id: "settings",
    name: "Project settings",
    screen: "/bench/settings",
    prompt: "Rename the project to Atlas, make it public, move it to Europe, turn on the weekly digest, and save the project.",
    check: () => {
      const form = document.querySelector("#project-form")
      const name = form.querySelector('input[name="project-name"], input')?.value
      const triggers = [...form.querySelectorAll('[data-slot="select-trigger"]')].map((t) => t.textContent.trim())
      const digest = [...form.querySelectorAll('[role="switch"]')][0]?.getAttribute("aria-checked")
      const saved = document.querySelector(".project-notice")?.textContent?.includes("Saved")
      const ok = name === "Atlas" && triggers.includes("Public") && triggers.includes("Europe") && digest === "true" && !!saved
      return { ok, detail: { name, triggers, digest, saved } }
    },
  },
  {
    id: "grid",
    name: "Data grid",
    screen: "/bench/grid",
    prompt: "In the Orders grid, show only the orders from Europe, sorted by amount from highest to lowest.",
    check: () => {
      const rows = [...document.querySelectorAll('[role="row"]')].filter((r) => r.querySelector('[role="gridcell"]'))
      const header = [...document.querySelectorAll('[role="columnheader"]')].map((h) => h.textContent.trim())
      const col = (label) => header.findIndex((h) => h.startsWith(label))
      const regionAt = col("Region")
      const amountAt = col("Amount")
      const read = (row, i) => row.querySelectorAll('[role="gridcell"], [role="rowheader"]')[i]?.textContent.trim() ?? ""
      const sample = rows.slice(0, 8).map((r) => ({ region: read(r, regionAt), amount: Number(read(r, amountAt).replace(/[^0-9.]/g, "")) }))
      const sortedDesc = sample.every((s, i) => i === 0 || sample[i - 1].amount >= s.amount)
      const allEurope = sample.length > 0 && sample.every((s) => s.region === "Europe")
      return { ok: allEurope && sortedDesc, detail: { sample: sample.slice(0, 4), allEurope, sortedDesc } }
    },
  },
  {
    id: "scheduler",
    name: "Scheduler",
    screen: "/bench/scheduler",
    prompt: "Add a 30-minute event called Roadmap sync on Wednesday this week, starting at 10:00 AM.",
    check: () => {
      const events = [...document.querySelectorAll(".schedule-event, [data-slot='span']")].map((e) => (e.getAttribute("aria-label") || e.textContent || "").replace(/\s+/g, " "))
      const matches = events.filter((t) => /Roadmap sync/i.test(t))
      const ok = matches.some((m) => /Wednesday/i.test(m) && /10:00 AM to 10:30 AM/.test(m))
      return { ok, detail: { matches } }
    },
  },
]

export { tasks }
