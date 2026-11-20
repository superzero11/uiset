// The Chat app template's stand-in model and sample lists, without a framework: the React
// template and the web page both stream from it. Plug in your model as an `Assistant`, an
// async generator of events; with the AI SDK, map its stream parts (text, reasoning, tool
// calls, sources) to these events one to one. An agent adds checkpoints, subagent runs and
// tool calls that wait for a person: `approval(id)` resolves with their answer.

type AssistantToolStatus = "pending" | "running" | "approval" | "done" | "error" | "denied"
type AssistantSource = { href: string; title: string; description?: string }
type AssistantTool = { id: string; name: string; title?: string; status: AssistantToolStatus; input?: unknown; output?: unknown }

type AssistantEvent =
  | { type: "text"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "reasoning-end"; seconds?: number }
  | ({ type: "tool" } & AssistantTool)
  | { type: "sources"; sources: AssistantSource[] }
  /** A point to go back to, before the agent changes things. */
  | { type: "checkpoint"; id: string; label?: string }
  /** Work handed to a subagent; send it again as it changes. `steps` are its tool calls and text. */
  | {
      type: "subagent"
      id: string
      name: string
      task?: string
      status: "running" | "done" | "failed"
      seconds?: number
      steps?: (({ type: "tool" } & AssistantTool) | { type: "text"; text: string })[]
    }

type AssistantInput = {
  text: string
  files: File[]
  model: string
  history: { from: "user" | "assistant"; text: string }[]
  signal: AbortSignal
  /** After a tool event with status "approval": resolves true once the person allows it,
   *  false if they deny it or the answer stops. */
  approval: (toolId: string) => Promise<boolean>
}

type Assistant = (input: AssistantInput) => AsyncIterable<AssistantEvent>

/** Waits, or stops waiting as soon as `signal` aborts. */
const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const stop = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stop)
      resolve()
    }, ms)
    signal?.addEventListener("abort", stop, { once: true })
  })

async function* words(text: string, signal: AbortSignal): AsyncIterable<AssistantEvent> {
  for (const word of text.split(/(?<= )/)) {
    if (signal.aborted) return
    yield { type: "text", delta: word }
    await wait(20, signal)
  }
}

let runs = 0

/** A stand-in agent: a checkpoint, a subagent's research, an edit, then a deploy that waits for a person. */
async function* sampleAgent({ signal, approval }: AssistantInput): AsyncIterable<AssistantEvent> {
  const run = ++runs
  yield { type: "checkpoint", id: `cp-${run}`, label: "Before the fix" }
  const thought = "Find where dates are formatted, pass the locale, and check it on a preview."
  for (let i = 0; i < thought.length && !signal.aborted; i += 4) {
    yield { type: "reasoning", delta: thought.slice(i, i + 4) }
    await wait(16, signal)
  }
  yield { type: "reasoning-end", seconds: 2 }
  const research = { type: "subagent" as const, id: `sub-${run}`, name: "Researcher", task: "Find where the date format comes from" }
  yield { ...research, status: "running" }
  await wait(900, signal)
  if (signal.aborted) return
  yield {
    ...research,
    status: "done",
    seconds: 4,
    steps: [
      { type: "tool", id: `search-${run}`, name: "search_code", title: "Searched the code", status: "done", input: { query: "toLocaleDateString" }, output: { files: ["src/date.ts"] } },
      { type: "text", text: "It's `formatDate` in `src/date.ts`, which ignores the locale." },
    ],
  }
  const edit = { type: "tool" as const, id: `edit-${run}`, name: "edit_file", title: "Edited src/date.ts", input: { path: "src/date.ts" } }
  yield { ...edit, status: "running" }
  await wait(450, signal)
  yield { ...edit, status: "done", output: { lines: "+3 −1" } }
  yield* words("`formatDate` now takes the locale. Deploying a preview is outside the sandbox, so it needs your yes.", signal)
  const deploy = { type: "tool" as const, id: `deploy-${run}`, name: "deploy_preview", title: "Deploy a preview", input: { branch: "fix/date-locale" } }
  yield { ...deploy, status: "approval" }
  const allowed = await approval(deploy.id)
  if (signal.aborted) return
  if (!allowed) {
    yield { ...deploy, status: "denied" }
    yield* words("\n\nOkay, no preview. The fix is on the branch when you want one.", signal)
    return
  }
  yield { ...deploy, status: "running" }
  await wait(900, signal)
  if (signal.aborted) return
  yield { ...deploy, status: "done", output: { url: "https://fix-date-locale.preview.example.com" } }
  yield* words("\n\nThe preview is up: https://fix-date-locale.preview.example.com", signal)
}

/** A stand-in model: thinks, searches, cites and answers, slowly enough to see. Asked to fix
 *  or change something, it works as an agent instead. */
async function* sampleAssistant(input: AssistantInput): AsyncIterable<AssistantEvent> {
  const { text, files, signal } = input
  if (/\b(fix|change|deploy)\b/i.test(text)) return yield* sampleAgent(input)
  const thought = `They asked: "${text}". Check the docs, then answer briefly with an example.`
  for (let i = 0; i < thought.length && !signal.aborted; i += 4) {
    yield { type: "reasoning", delta: thought.slice(i, i + 4) }
    await wait(16, signal)
  }
  yield { type: "reasoning-end", seconds: 2 }
  yield { type: "tool", id: "t1", name: "search_docs", title: "Searched the docs", status: "running", input: { query: text.slice(0, 60) } }
  await wait(450, signal)
  yield { type: "tool", id: "t1", name: "search_docs", title: "Searched the docs", status: "done", input: { query: text.slice(0, 60) }, output: { results: 2 } }
  yield {
    type: "sources",
    sources: [
      { title: "AbortController", href: "https://developer.mozilla.org/docs/Web/API/AbortController" },
      { title: "Using the Fetch API", href: "https://developer.mozilla.org/docs/Web/API/Fetch_API/Using_Fetch" },
    ],
  }
  const reply = `Here's a short answer to **"${text}"**.\n\nThis assistant is a stand-in: pass your own \`assistant\` to stream real answers.\n\n\`\`\`ts\nconst answer = await assistant.reply(${JSON.stringify(text.slice(0, 40))})\n\`\`\`\n\n${files.length ? `I received ${files.length} attachment${files.length === 1 ? "" : "s"}.` : "Attach a file with the paperclip, or paste one."}`
  yield* words(reply, signal)
}

const sampleModels = [
  { value: "fast", label: "Fast", description: "Quick answers" },
  { value: "balanced", label: "Balanced", description: "The default" },
  { value: "deep", label: "Deep", description: "Thinks longer" },
]
const sampleCommands = [
  { value: "summarize", label: "Summarize", description: "Shorten the thread" },
  { value: "explain", label: "Explain", description: "Explain the last answer" },
  { value: "translate", label: "Translate", description: "Into another language" },
]
const sampleMentions = [
  { value: "src/search.ts", label: "search.ts" },
  { value: "src/routes.ts", label: "routes.ts" },
  { value: "README.md", label: "README.md" },
]
const sampleSuggestions = ["Fix the date format and deploy a preview", "Draft release notes", "Explain AbortController"]

/** A rough token count for the usage meter, until your model reports its own. */
const estimateTokens = (text: string) => 900 + text.length * 4

export { estimateTokens, sampleAssistant, sampleCommands, sampleMentions, sampleModels, sampleSuggestions, wait }
export type { Assistant, AssistantEvent, AssistantInput, AssistantSource, AssistantTool, AssistantToolStatus }
