// Whether an agent can use a page: every component the agent bridge lists has a name, each
// name finds one component, and every control a person can reach is one the agent sees. It
// asks the bridge itself (`snapshot` and `query`), so it reads the page as an agent does, in
// any framework UI SDK serves, in a test or on a live page.

/** A component as the bridge reports it: the part of `snapshot()` and `query()` the check reads. */
type AgentEntry = {
  ref: string
  component: string
  label?: string
  row?: string
  confirm?: string
  offPage?: boolean
  disabled?: boolean
  actions: string[]
  more?: number
}

/** What `createAgent` returns, from any UI SDK package, or the same two calls through its WebMCP tools. */
type AgentBridge = {
  snapshot(): AgentEntry[] | Promise<AgentEntry[]>
  query(input: { text?: string; kind?: string }): Promise<AgentEntry[] | { error: string }>
}

/** A control a person can use that no agent can: a native button, field or widget outside UI SDK. */
type UnseenControl = {
  /** Its element and accessible name, like `button "Revenue"`. */
  control: string
  /** Where it is: the nearest element around it with an id, a name or a heading. */
  near?: string
}

type Problem =
  | { kind: "unnamed"; severity: "error"; ref: string; component: string; message: string }
  | { kind: "ambiguous"; severity: "error"; label: string; refs: string[]; components: string[]; message: string }
  | ({ kind: "unseen"; severity: "error"; message: string } & UnseenControl)
  | { kind: "unconfirmed"; severity: "warning"; ref: string; label: string; message: string }
  | { kind: "overflow"; severity: "warning"; shown: number; more: number; unchecked: number; message: string }

type AgentReadinessReport = {
  /** How it was read: through the page's UI SDK agent bridge. */
  mode: "bridge"
  /** 0 to 100: the share of controls an agent can find by name. Errors lower it; warnings don't. */
  score: number
  /** The controls counted: the components the bridge lists, and the controls it can't see. */
  controls: number
  /** Those an agent can find by name: named, and the only component its name finds. */
  ready: number
  problems: Problem[]
}

type CheckOptions = {
  /** Where to look for controls agents can't see. The whole document by default. */
  root?: ParentNode | string
  /** Leaves out problems you've decided to accept, like a third-party widget's. */
  ignore?: (problem: Problem) => boolean
  /** Replaces the page scans, for a page in another process (see `checkPage`). */
  scan?: {
    unseen: () => UnseenControl[] | Promise<UnseenControl[]>
    slots: () => string[] | Promise<string[]>
  }
}

const isEntryList = (value: unknown): value is AgentEntry[] => Array.isArray(value)

/** Words the way the bridge matches them: whole words, ignoring case and accents. */
const wordsOf = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? []

/** Whether a step naming `text` would take this component: every word in its label or row. */
const names = (entry: AgentEntry, text: string) => {
  const wanted = wordsOf(text)
  return [entry.label, entry.row].some((own) => {
    if (!own) return false
    const have = new Set(wordsOf(own))
    return wanted.length > 0 && wanted.every((word) => have.has(word))
  })
}

// Destructive or costly actions: a button whose label starts with one of these verbs.
const consequential = /^(delete|remove|destroy|erase|purge|wipe|revoke|pay|purchase|buy|charge|refund|transfer|deploy|publish|unpublish|deactivate)\b/i

/**
 * Controls a person can reach that no UI SDK component owns: native buttons, fields and ARIA
 * widgets with no `data-slot` (UI SDK marks every element it binds) that Tab reaches. Inner
 * parts a component drives itself, like a grid's checkboxes, are skipped: they're out of the
 * Tab order inside an element UI SDK bound. Self-contained, with no helpers outside it, so a
 * test runner can run it in the page (`page.evaluate(findUnseenControls, "#app")`).
 */
function findUnseenControls(root?: ParentNode | string | null): UnseenControl[] {
  const scope: ParentNode | null = typeof root === "string" ? document.querySelector(root) : (root ?? document)
  if (!scope) return []
  const selector = [
    "button",
    'input:not([type="hidden"])',
    "select",
    "textarea",
    '[contenteditable=""]',
    '[contenteditable="true"]',
    ...["button", "checkbox", "radio", "switch", "slider", "spinbutton", "combobox", "textbox", "searchbox", "menuitem", "tab"].map((role) => `[role="${role}"]`),
  ].join(", ")
  const found: UnseenControl[] = []
  for (const el of Array.from(scope.querySelectorAll<HTMLElement>(selector))) {
    if (el.hasAttribute("data-slot")) continue
    if (el.closest('[hidden], [inert], [aria-hidden="true"], [data-agent-hidden]')) continue
    if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") continue
    if (typeof el.checkVisibility === "function" && !el.checkVisibility()) continue
    // Out of the Tab order inside an element UI SDK bound: a part the component drives itself,
    // like a grid's row checkbox (tabindex -1) or an editor's task box (no tabindex at all).
    const tabindex = el.getAttribute("tabindex")
    const tabbable =
      tabindex !== null
        ? Number(tabindex) >= 0
        : /^(button|input|select|textarea)$/.test(el.localName) || el.getAttribute("contenteditable") === "" || el.getAttribute("contenteditable") === "true"
    if (!tabbable && el.parentElement?.closest("[data-slot]")) continue
    const labelledBy = (el.getAttribute("aria-labelledby") ?? "")
      .split(/\s+/)
      .map((id) => (id ? document.getElementById(id)?.textContent : ""))
      .join(" ")
      .trim()
    const labels = (el as HTMLInputElement).labels
    const name = (
      el.getAttribute("aria-label") ||
      labelledBy ||
      (labels && labels.length ? (labels[0]!.textContent ?? "") : "") ||
      // As shown on screen where the browser lays it out (jsdom has no innerText).
      (el.localName === "button" || el.getAttribute("role") ? (el.innerText ?? el.textContent ?? "") : "") ||
      el.getAttribute("placeholder") ||
      el.getAttribute("title") ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60)
    const type = el.localName === "input" ? `input[type=${(el as HTMLInputElement).type}]` : el.getAttribute("role") ? `${el.localName}[role=${el.getAttribute("role")}]` : el.localName
    // Where it is, in words a person finds on the page: an id, a name, or a heading around it.
    let near: string | undefined
    for (let at = el.parentElement; at && !near; at = at.parentElement) {
      // Its own heading: a direct child, or one in a header or in its first child (a title row).
      const heading = at.querySelector(
        ":scope > :is(h1, h2, h3, h4, h5, h6, figcaption, legend), :scope > :is(header, :first-child) :is(h1, h2, h3, h4, h5, h6)",
      )
      const named = at.getAttribute("aria-label") || (heading?.textContent ?? "").replace(/\s+/g, " ").trim()
      if (at.id && at !== document.body) near = `#${at.id}`
      else if (named) near = `"${named.slice(0, 40)}"`
    }
    found.push({ control: name ? `${type} "${name}"` : type, near })
  }
  return found
}

/** The `data-slot` names on the page, to find components past the snapshot's first 100. Self-contained, like `findUnseenControls`. */
function slotNames(root?: ParentNode | string | null): string[] {
  const scope: ParentNode | null = typeof root === "string" ? document.querySelector(root) : (root ?? document)
  if (!scope) return []
  return Array.from(new Set(Array.from(scope.querySelectorAll("[data-slot]"), (el) => el.getAttribute("data-slot") ?? ""))).filter(Boolean)
}

/**
 * Checks a page as an agent would use it, through its UI SDK agent bridge. Errors: a
 * component with no name, a name that finds more than one component (a step by that name
 * fails), and a control a person can use that the agent can't see. Warnings: a destructive
 * button with no `data-agent-confirm`, and a page past the snapshot's 100 components.
 */
async function checkAgentReadiness(agent: AgentBridge, options: CheckOptions = {}): Promise<AgentReadinessReport> {
  const scan = options.scan ?? { unseen: () => findUnseenControls(options.root), slots: () => slotNames(options.root) }
  const problems: Problem[] = []
  const listed = await agent.snapshot()
  const more = listed.find((entry) => entry.component === "more")
  const byRef = new Map<string, AgentEntry>()
  for (const entry of listed) if (entry.component !== "more" && !entry.offPage) byRef.set(entry.ref, entry)

  if (more) {
    // The snapshot stops at 100: the rest come back from `query`, one kind at a time.
    // A query stops at 100 too, so past 100 of one kind some can't be read.
    const kinds = new Set([...[...byRef.values()].map((entry) => entry.component), ...(await scan.slots())])
    const capped = new Map<string, number>()
    for (const kind of kinds) {
      const found = await agent.query({ kind })
      if (!isEntryList(found)) continue
      for (const entry of found) if (!entry.offPage && entry.component !== "more") byRef.set(entry.ref, entry)
      const left = found.find((entry) => entry.component === "more")?.more
      if (left) capped.set(kind, found.filter((entry) => entry.component !== "more").length + left)
    }
    const shown = listed.length - 1
    const rest = more.more ?? 0
    let unchecked = 0
    for (const [kind, total] of capped) unchecked += Math.max(0, total - [...byRef.values()].filter((entry) => entry.component === kind).length)
    problems.push({
      kind: "overflow",
      severity: "warning",
      shown,
      more: rest,
      unchecked,
      message:
        `Agents see ${shown} components in a snapshot and must query for the other ${rest}. Fewer components per view (tabs, pages, collapsed sections) let an agent see the whole of it at once.` +
        (unchecked ? ` ${unchecked} couldn't be checked: a query returns 100 at most.` : ""),
    })
  }

  const entries = [...byRef.values()]
  const notReady = new Set<string>()

  for (const entry of entries) {
    if (entry.label?.trim()) continue
    notReady.add(entry.ref)
    problems.push({
      kind: "unnamed",
      severity: "error",
      ref: entry.ref,
      component: entry.component,
      message: `${entry.component} ${entry.ref} has no name, so a step can't find it. Give it a label part or aria-label, or aria-hidden="true" if it's decoration.`,
    })
  }

  // Each name, as a step would use it: the bridge's own search, then only the components a
  // step by that name would take (a list found by one of its items isn't one).
  // Only names a step would use: a component with no actions, like an avatar, is never one's target.
  const labels = new Map<string, AgentEntry[]>()
  for (const entry of entries) if (entry.label?.trim() && entry.actions.length) labels.set(entry.label, [...(labels.get(entry.label) ?? []), entry])
  const reported = new Set<string>()
  for (const [label, own] of labels) {
    const found = await agent.query({ text: label })
    // A closed tooltip whose trigger is listed is left out of the snapshot, and a step by the
    // trigger's name presses the trigger (UI SDK 0.1.0-beta.8), so only a search finds it.
    const taken = (isEntryList(found) ? found : own).filter(
      (entry) => !entry.offPage && entry.component !== "more" && !(entry.component === "tooltip" && !byRef.has(entry.ref)) && names(entry, label),
    )
    const refs = [...new Set([...own.map((entry) => entry.ref), ...taken.map((entry) => entry.ref)])]
    // Every component the name finds counts, with actions or not: a step can't tell them apart.
    if (refs.length < 2) continue
    for (const entry of own) notReady.add(entry.ref)
    const key = `${label}\u0000${[...refs].sort().join(",")}`
    if (reported.has(key)) continue
    reported.add(key)
    const all = refs.map((ref) => byRef.get(ref) ?? taken.find((entry) => entry.ref === ref)!)
    const popups = all.some((entry) => /^(tooltip|menu|dialog|alert-dialog|popover|hover-card)$/.test(entry.component))
    problems.push({
      kind: "ambiguous",
      severity: "error",
      label,
      refs,
      components: all.map((entry) => entry.component),
      message:
        `"${label}" names ${refs.length} components (${all.map((entry) => `${entry.component} ${entry.ref}${entry.label === label ? "" : ` "${entry.label}"`}`).join(", ")}), so a step by that name fails. ` +
        (popups
          ? "A closed tooltip, menu or dialog takes its trigger's name: give a tooltip its own aria-label, and a dialog keepMounted so its title names it."
          : "Give each a name of its own, with words the others don't contain."),
    })
  }

  const unseen = await scan.unseen()
  for (const control of unseen) {
    problems.push({
      kind: "unseen",
      severity: "error",
      ...control,
      message: `${control.control}${control.near ? ` (in ${control.near})` : ""} isn't a UI SDK component, so agents can't see or use it. Use the UI SDK part for it (Button, Input, Toggle…), or put it inside data-agent-hidden if agents shouldn't use it.`,
    })
  }

  for (const entry of entries) {
    if (entry.component !== "button" || entry.confirm || !entry.label || !consequential.test(entry.label)) continue
    problems.push({
      kind: "unconfirmed",
      severity: "warning",
      ref: entry.ref,
      label: entry.label,
      message: `"${entry.label}" may be hard to undo, and an agent can press it without asking. If a person should approve it, add data-agent-confirm saying what it does.`,
    })
  }

  const kept = options.ignore ? problems.filter((problem) => !options.ignore!(problem)) : problems
  const ignoredRefs = new Set(
    problems
      .filter((problem) => !kept.includes(problem))
      .flatMap((problem) => (problem.kind === "unnamed" ? [problem.ref] : problem.kind === "ambiguous" ? problem.refs : [])),
  )
  const unseenCount = kept.filter((problem) => problem.kind === "unseen").length
  const controls = entries.length + unseenCount
  const ready = entries.filter((entry) => !notReady.has(entry.ref) || ignoredRefs.has(entry.ref)).length
  return { mode: "bridge", score: controls ? Math.floor((100 * ready) / controls) : 100, controls, ready, problems: kept }
}

/** What any report has: from the bridge (`checkAgentReadiness`) or the page (`checkPageReadiness`). */
type ReadinessSummary = {
  mode: "bridge" | "page"
  score: number
  controls: number
  ready: number
  problems: { kind: string; severity: "error" | "warning"; message: string }[]
}

/** The report as text: the score, then each problem on its own line. */
function formatAgentReadiness(report: ReadinessSummary, title?: string) {
  const read = report.mode === "page" ? ", read from the page: no UI SDK bridge" : ""
  const head = `${title ? `${title}: ` : ""}agent readiness ${report.score}/100 (${report.ready} of ${report.controls} controls an agent can find by name${read})`
  return [head, ...report.problems.map((problem) => `  ${problem.severity === "error" ? "error" : "warning"} ${problem.kind}: ${problem.message}`)].join("\n")
}

/**
 * For tests: checks the page and throws, with the report, when the score is under `minScore`
 * (100 by default) or a problem of a kind in `fail` is found (errors by default).
 */
async function expectAgentReady(agent: AgentBridge, options: CheckOptions & { minScore?: number; fail?: Problem["kind"][] } = {}) {
  const report = await checkAgentReadiness(agent, options)
  const fail = options.fail ?? ["unnamed", "ambiguous", "unseen"]
  if (report.score < (options.minScore ?? 100) || report.problems.some((problem) => fail.includes(problem.kind))) {
    throw new Error(formatAgentReadiness(report))
  }
  return report
}

export { checkAgentReadiness, expectAgentReady, findUnseenControls, formatAgentReadiness, slotNames }
export type { AgentBridge, AgentEntry, AgentReadinessReport, CheckOptions, Problem as AgentReadinessProblem, ReadinessSummary, UnseenControl }
