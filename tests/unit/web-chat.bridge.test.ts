import { waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { checkAgentReadiness, formatAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import { createBridge, settle } from "./bridge"
import { openWebPage } from "./web-page"

// The Chat page as web elements (web/chat.html), driven through the web agent bridge. Moved
// from tests/e2e/web/chat.spec.ts.

type Chat = HTMLElement & { messages: unknown[]; allowImage?: (url: URL) => boolean }
type Bridge = ReturnType<typeof createBridge>
const chat = () => document.querySelector("uiset-chat") as Chat
const log = () => document.querySelector("uiset-chat [role=log]") as HTMLElement
const messages = (from: string) => [...document.querySelectorAll(`uiset-chat .chat-message[data-from=${from}]`)]
const answered = () => [...document.querySelectorAll("uiset-chat .chat-message[data-from=assistant]:not([data-streaming])")]
const field = () => document.querySelector("uiset-chat-composer textarea") as HTMLTextAreaElement

/** Writes in the composer through the bridge, at the caret where a person would type. */
async function write(bridge: Bridge, text: string) {
  field().focus()
  expect((await bridge.run("Message", "insert", text)).ok).toBe(true)
}

/** Waits for the page's pretend model to finish its answer: the composer stops running. */
async function answer(count: number) {
  await waitFor(
    () => {
      expect(document.querySelector("uiset-chat-composer")?.hasAttribute("running")).toBe(false)
      expect(answered()).toHaveLength(count)
      expect(answered().at(-1)?.textContent).toContain("Publish the changelog")
    },
    { timeout: 5000 },
  )
}

/** Sends with Enter, and waits for the answer. */
async function ask(bridge: Bridge, text: string) {
  const count = messages("assistant").length + 1
  await write(bridge, text)
  field().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
  await waitFor(() => expect(document.querySelector("uiset-chat-composer")?.hasAttribute("running")).toBe(true))
  await answer(count)
}

// The elements' modules load once per file, and the first load can take a while.
beforeAll(() => import("../../web/src/uiset"), 60_000)

beforeAll(() => {
  // jsdom has no DataTransfer: the composer builds its `files` FileList with one.
  globalThis.DataTransfer ??= class {
    #files: File[] = []
    items = { add: (file: File) => void this.#files.push(file) }
    get files() {
      return Object.assign([...this.#files], { item: (i: number) => this.#files[i] ?? null }) as unknown as FileList
    }
  } as unknown as typeof DataTransfer
})

afterEach(() => {
  document.body.innerHTML = ""
})

test("a message sent with Enter gets a streamed answer drawn as markdown", { timeout: 15_000 }, async () => {
  const bridge = await openWebPage("chat.html", "chat-demo.ts")
  await ask(bridge, "What's left before the release?")
  expect(messages("user").at(-1)?.textContent).toContain("What's left before the release?")
  const reply = messages("assistant").at(-1) as HTMLElement
  expect([...reply.querySelectorAll("strong")].map((el) => el.textContent)).toContain("Friday")
  expect(reply.querySelectorAll(".chat-response ol li")).toHaveLength(3)
  within(within(reply).getByRole("region", { name: "Table" })).getByRole("row", { name: "Tag Grace" })
  // The code block: its language, Wrap and Copy, and shiki's colors.
  expect(within(reply).getByRole("region", { name: /^ts\b/ }).textContent).toContain('await release({ tag: "v1.4.0", notes: changelog })')
  expect(bridge.entry("Copy ts").actions).toContain("press")
  await bridge.run("Wrap lines", "setPressed", true)
  expect(reply.querySelector(".chat-code")?.hasAttribute("data-wrap")).toBe(true)
  await waitFor(() => expect(reply.querySelectorAll(".chat-code-line span[style]").length).toBeGreaterThan(0))
})

test("reasoning, the tool call and sources show as disclosures", { timeout: 15_000 }, async () => {
  const bridge = await openWebPage("chat.html", "chat-demo.ts")
  await ask(bridge, "What's left?")
  const reply = messages("assistant").at(-1) as HTMLElement
  expect(bridge.find("Thought for 2s")).toBeDefined()
  await bridge.press(/^Search issues\s*,\s*Done$/)
  expect(within(reply).getByRole("region", { name: /^Search issues output/ }).textContent).toContain('"open": 3')
  await bridge.press("Used 1 source")
  // dom-accessibility-api drops the space a browser keeps before the hidden words.
  expect(within(reply).getByRole("link", { name: /^Release board\s*\(opens in a new tab\)$/ }).getAttribute("target")).toBe("_blank")
})

test("raw HTML in an answer is shown as nothing, never run", async () => {
  await openWebPage("chat.html", "chat-demo.ts")
  chat().messages = [{ id: "x", role: "assistant", parts: [{ type: "text", text: 'Hello <img src=x onerror="window.pwned=1"> **world**' }] }]
  await waitFor(() => expect(document.querySelector("uiset-chat strong")?.textContent).toBe("world"))
  expect((window as unknown as { pwned?: number }).pwned).toBeUndefined()
  expect(document.querySelectorAll("uiset-chat img")).toHaveLength(0)
})

test("answers have Copy, Retry and feedback; a suggestion sends itself", { timeout: 15_000 }, async () => {
  const bridge = await openWebPage("chat.html", "chat-demo.ts")
  await bridge.press("Suggestions", "Write the changelog")
  expect(messages("user").at(-1)?.textContent).toContain("Write the changelog")
  await answer(1)
  const feedback: unknown[] = []
  chat().addEventListener("feedbackchange", (e) => feedback.push((e as CustomEvent<{ value: string }>).detail.value))
  expect(bridge.find(/^Actions: "Here's what's left/)).toBeDefined()
  expect(answered().at(-1)?.querySelector('[aria-label^="Copy message"]')).not.toBeNull()
  await bridge.run(/^Good response: "Here's what's left/, "setPressed", true)
  expect(feedback).toEqual(["good"])
  await bridge.press(/^Actions: "Here's what's left/, "Retry message")
  await waitFor(() => expect(document.querySelector("uiset-chat-composer")?.hasAttribute("running")).toBe(true))
  await answer(1)
  expect(messages("assistant")).toHaveLength(1)
})

// Every message has the same actions, so each one's names carry its message's first words: an
// agent pressing "Copy message" can tell which reply it copies.
test("each message's actions are named with its first words", async () => {
  await openWebPage("chat.html", "chat-demo.ts")
  chat().setAttribute("editable", "")
  chat().messages = [
    { id: "q", role: "user", parts: [{ type: "text", text: "Can you summarize the **release notes** for me?" }] },
    { id: "a", role: "assistant", parts: [{ type: "text", text: "Here's a summary of the release, in three parts." }] },
    { id: "b", role: "assistant", parts: [{ type: "text", text: "Done." }] },
  ]
  const names = (from: string) => [...log().querySelectorAll(`.chat-message[data-from=${from}] .chat-actions button`)].map((b) => b.getAttribute("aria-label"))
  await waitFor(() => expect(names("user")).toEqual(['Edit message: "Can you summarize the release…"']))
  expect(names("assistant")).toEqual([
    `Copy message: "Here's a summary of the…"`,
    `Good response: "Here's a summary of the…"`,
    `Bad response: "Here's a summary of the…"`,
    'Copy message: "Done."',
    'Retry message: "Done."',
    'Good response: "Done."',
    'Bad response: "Done."',
  ])
})

// With two replies and a composer named "Message", each reply's toolbar and feedback group
// need names of their own too, or a step by one finds the other (or the composer).
test("with several replies on the page, the check still scores 100", async () => {
  await openWebPage("chat.html", "chat-demo.ts")
  chat().messages = [
    { id: "q", role: "user", parts: [{ type: "text", text: "How do I cancel a fetch?" }] },
    { id: "a", role: "assistant", parts: [{ type: "text", text: "Use an AbortController." }] },
    { id: "b", role: "assistant", parts: [{ type: "text", text: "Pass its signal to fetch." }] },
  ]
  await waitFor(() => expect(log().querySelectorAll(".chat-message[data-from=assistant] [role=toolbar]")).toHaveLength(2))
  const toolbars = [...log().querySelectorAll(".chat-message[data-from=assistant] [role=toolbar]")]
  expect(toolbars.map((el) => el.getAttribute("aria-label"))).toEqual(['Actions: "Use an AbortController."', 'Actions: "Pass its signal to fetch."'])
  expect(within(log()).getAllByRole("group", { name: 'Feedback: "Use an AbortController."' })).toHaveLength(1)
  // The page's own bridge, as the browser check reaches it. The setup's checkVisibility says
  // everything shows; here, as in a browser, what's under `hidden` (the closed delete dialog,
  // untitled until a chat is chosen) doesn't.
  const agent = (window as unknown as { agent: Parameters<typeof checkAgentReadiness>[0] }).agent
  const visible = Element.prototype.checkVisibility
  Element.prototype.checkVisibility = function (this: Element) {
    return !this.closest("[hidden]")
  }
  try {
    const report = await checkAgentReadiness(agent)
    expect(report.score, formatAgentReadiness(report, "chat")).toBe(100)
  } finally {
    Element.prototype.checkVisibility = visible
  }
})

test("a tool call waiting on the person offers Allow and Deny, and reports the choice", async () => {
  const bridge = await openWebPage("chat.html", "chat-demo.ts")
  const approved: unknown[] = []
  chat().addEventListener("approve", (e) => approved.push((e as CustomEvent).detail))
  chat().messages = [{ id: "a", role: "assistant", parts: [{ type: "tool-deploy", title: "Deploy to production", state: "approval-requested", input: { env: "prod" } }] }]
  await settle()
  expect(log().querySelector(".chat-tool")?.getAttribute("data-status")).toBe("approval")
  expect(bridge.entry("Allow").confirm).toBe("Runs Deploy to production")
  await bridge.press("Deny")
  expect(approved).toEqual([{ value: false, id: "a", part: 0 }])
})

test("the log keeps each message's element: earlier messages aren't re-added, a streaming one changes in place", { timeout: 15_000 }, async () => {
  const bridge = await openWebPage("chat.html", "chat-demo.ts")
  await ask(bridge, "First")
  // Watch the log while a second answer streams: what it removes is what a screen reader
  // would hear again.
  const first = log().querySelector(".chat-message[data-from=user]")
  const removed: string[] = []
  new MutationObserver((records) => {
    for (const record of records) for (const node of record.removedNodes) if (node instanceof Element && node.matches(".chat-message")) removed.push(node.getAttribute("data-id") ?? "?")
  }).observe(log(), { childList: true })
  await ask(bridge, "Second")
  expect(messages("user")).toHaveLength(2)
  expect(answered()).toHaveLength(2)
  expect(removed.filter((id) => id !== "?")).toEqual([])
  expect(document.querySelector("uiset-chat .chat-message[data-from=user]")).toBe(first)
})

test("links an answer carries can't run script, however they're written", async () => {
  await openWebPage("chat.html", "chat-demo.ts")
  chat().messages = [
    {
      id: "x",
      role: "assistant",
      parts: [
        { type: "text", text: "[a](javascript:alert(1)) [b](jav&#x61;script:alert(1)) <javascript:alert(1)> [c][r] [ok](https://example.com) [rel](/docs)\n\n[r]: javascript:alert(1)" },
        { type: "file", mediaType: "application/pdf", url: "javascript:alert(1)", filename: "bad.pdf" },
      ],
    },
  ]
  await waitFor(() => expect(within(log()).getByRole("link", { name: /^ok/ }).getAttribute("href")).toBe("https://example.com"))
  const hrefs = [...log().querySelectorAll("a")].map((a) => a.getAttribute("href"))
  expect(hrefs.filter((href) => href && /script/i.test(href))).toEqual([])
  expect(within(log()).getByRole("link", { name: "rel" }).getAttribute("href")).toBe("/docs")
  expect(log().textContent).toContain("bad.pdf")
})

test("a remote image in an answer is a link, unless the page allows it", async () => {
  await openWebPage("chat.html", "chat-demo.ts")
  chat().messages = [{ id: "x", role: "assistant", parts: [{ type: "text", text: "![chart](https://attacker.example/c.png?secret=1)" }] }]
  await waitFor(() => expect(within(log()).getByRole("link", { name: /Image: chart/ }).getAttribute("href")).toBe("https://attacker.example/c.png?secret=1"))
  // jsdom loads nothing, so instead of watching requests: nothing on the page would fetch it.
  expect(document.querySelectorAll('[src*="attacker.example"], [srcset*="attacker.example"]')).toHaveLength(0)
  chat().allowImage = (url) => url.hostname === "attacker.example"
  await waitFor(() => expect(log().querySelectorAll('img[alt="chart"]')).toHaveLength(1))
})

test("properties set before the elements are defined still draw", async () => {
  await openWebPage("chat.html", "chat-demo.ts")
  // An element in a template's content isn't upgraded: what a page's script sets on it then is
  // an own property, as before UISet's module loads, there when it upgrades on joining the page.
  const template = document.createElement("template")
  template.innerHTML = `<uiset-root><uiset-chat id="c" label="Early"></uiset-chat><uiset-chat-threads id="t"></uiset-chat-threads></uiset-root>`
  const root = template.content.firstElementChild!
  Object.assign(root.querySelector("#c")!, { messages: [{ id: "a", role: "assistant", parts: [{ type: "text", text: "Set **early**" }] }] })
  Object.assign(root.querySelector("#t")!, { threads: [{ id: "t1", title: "First chat" }] })
  document.body.replaceChildren(document.adoptNode(root))
  const early = document.getElementById("c") as Chat
  await waitFor(() => expect(early.querySelector("strong")?.textContent).toBe("early"))
  within(document.getElementById("t")!).getByRole("button", { name: "Open First chat" })
  // And later sets still reach the element.
  early.messages = []
  await waitFor(() => expect(early.textContent).toContain("How can I help?"))
})

// Typing in jsdom doesn't open the menu: the bridge writes the command and opens it on that match.
test("the command menu shows each command's description under its name, as in React", async () => {
  const bridge = await openWebPage("chat.html", "chat-demo.ts")
  const option = (name: RegExp) => within(document.querySelector("uiset-chat-composer") as HTMLElement).queryByRole("option", { name })
  await write(bridge, "/")
  await bridge.run("Message", "setOpen", true)
  await waitFor(() => expect(option(/^summarize/)?.querySelector(".chat-menu-hint")?.textContent).toBe("Sum up the conversation"))
  await bridge.run("Message", "setOpen", false)
  ;(document.querySelector("uiset-chat-composer") as HTMLElement & { value: string }).value = ""
  await write(bridge, "/pl")
  await bridge.run("Message", "setOpen", true)
  await waitFor(() => expect(option(/^plan/)?.querySelector(".chat-menu-hint")?.textContent).toBe("Make a step-by-step plan"))
  expect(option(/^summarize/)).toBeNull()
})
