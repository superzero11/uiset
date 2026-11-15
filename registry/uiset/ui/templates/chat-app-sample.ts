// The Chat app template's stand-in model and sample lists, without a framework: the React
// template and the web page both stream from it. Plug in your model as an `Assistant`, an
// async generator of events; with the AI SDK, map its stream parts (text, reasoning, tool
// calls, sources) to these events one to one.

type AssistantToolStatus = "pending" | "running" | "approval" | "done" | "error" | "denied"
type AssistantSource = { href: string; title: string; description?: string }

type AssistantEvent =
  | { type: "text"; delta: string }
  | { type: "reasoning"; delta: string }
  | { type: "reasoning-end"; seconds?: number }
  | { type: "tool"; id: string; name: string; title?: string; status: AssistantToolStatus; input?: unknown; output?: unknown }
  | { type: "sources"; sources: AssistantSource[] }

type AssistantInput = {
  text: string
  files: File[]
  model: string
  history: { from: "user" | "assistant"; text: string }[]
  signal: AbortSignal
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

/** A stand-in model: thinks, searches, cites and answers, slowly enough to see. */
async function* sampleAssistant({ text, files, signal }: AssistantInput): AsyncIterable<AssistantEvent> {
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
  for (const word of reply.split(/(?<= )/)) {
    if (signal.aborted) return
    yield { type: "text", delta: word }
    await wait(20, signal)
  }
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
const sampleSuggestions = ["Review my search hook", "Draft release notes", "Explain AbortController"]

/** A rough token count for the usage meter, until your model reports its own. */
const estimateTokens = (text: string) => 900 + text.length * 4

export { estimateTokens, sampleAssistant, sampleCommands, sampleMentions, sampleModels, sampleSuggestions, wait }
export type { Assistant, AssistantEvent, AssistantInput, AssistantSource, AssistantToolStatus }
