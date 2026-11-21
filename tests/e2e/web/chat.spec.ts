import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"
import { formatAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import { checkPage, waitForAgent } from "@/registry/uiset/ui/agent-check/playwright"

// Chat as web elements, on a page with no React: messages with parts in, events out. The
// page's pretend model thinks, calls a tool, streams markdown with code and a table, and
// cites a source.
const log = (page: Page) => page.getByRole("log")
const composer = (page: Page) => page.getByRole("textbox", { name: "Message" })

async function ask(page: Page, text: string) {
  await composer(page).fill(text)
  await composer(page).press("Enter")
  await expect(page.locator("uiset-chat .chat-message[data-from=assistant]:not([data-streaming])").last()).toContainText("Publish the changelog")
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/chat.html")
  await expect(page.getByText("How can I help?")).toBeVisible()
})

// The React chat lost following after a wheel at its end over a one-pixel rounding (2026-11-20,
// like shadcn-ui/ui#12766; site.spec.ts reproduces it). This build doesn't round that way here,
// so this guards that a wheel and End at the end keep following, with the same re-arm wired in.
test("the thread keeps following after a wheel or End at its end", { tag: "@engine" }, async ({ page }) => {
  await ask(page, "What's left?")
  await page.addStyleTag({ content: ".chat-thread-frame { max-height: 220px }" })
  const log = page.locator(".chat-thread-log").first()
  const height = await log.evaluate((el) => el.getBoundingClientRect().height)
  await page.addStyleTag({ content: `.chat-thread-log { padding-block-end: ${(1.6 - (height % 1)) % 1}px }` })
  const view = page.locator(".chat-thread-scroller")
  await view.evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
  await expect(view).toHaveAttribute("data-sticking", "")
  const area = (await view.boundingBox())!
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
  await page.mouse.wheel(0, 300)
  await view.focus()
  await page.keyboard.press("End")
  await page.waitForTimeout(600)
  await expect(view).toHaveAttribute("data-sticking", "")
  await ask(page, "And then?")
  expect(await view.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThanOrEqual(2)
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Chat page passes axe in ${skin}, ${theme}, with an answer showing`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await ask(page, "What's left?")
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("a message sent with Enter gets a streamed answer drawn as markdown", async ({ page }) => {
  await ask(page, "What's left before the release?")
  await expect(log(page).locator(".chat-message[data-from=user]")).toContainText("What's left before the release?")
  const answer = log(page).locator(".chat-message[data-from=assistant]").last()
  await expect(answer.locator("strong", { hasText: "Friday" })).toBeVisible()
  await expect(answer.locator(".chat-response ol li")).toHaveCount(3)
  await expect(answer.getByRole("region", { name: "Table" }).getByRole("row", { name: "Tag Grace" })).toBeVisible()
  // The code block: its language, Wrap and Copy, and shiki's colors.
  const code = answer.getByRole("region", { name: "ts" })
  await expect(code).toContainText('await release({ tag: "v1.4.0", notes: changelog })')
  await expect(answer.getByRole("button", { name: "Copy ts" })).toBeVisible()
  await answer.getByRole("button", { name: "Wrap lines" }).click()
  await expect(answer.locator(".chat-code")).toHaveAttribute("data-wrap", "")
  await expect.poll(() => answer.locator(".chat-code-line span[style]").count()).toBeGreaterThan(0)
})

test("reasoning, the tool call and sources show as disclosures", async ({ page }) => {
  await ask(page, "What's left?")
  const answer = log(page).locator(".chat-message[data-from=assistant]").last()
  await expect(answer.getByRole("button", { name: "Thought for 2s" })).toBeVisible()
  await answer.getByRole("button", { name: /^Search issues\s*,\s*Done$/ }).click()
  await expect(answer.getByRole("region", { name: "Search issues output" })).toContainText('"open": 3')
  await answer.getByRole("button", { name: "Used 1 source" }).click()
  await expect(answer.getByRole("link", { name: "Release board (opens in a new tab)" })).toHaveAttribute("target", "_blank")
})

test("raw HTML in an answer is shown as nothing, never run", async ({ page }) => {
  await page.locator("uiset-chat").evaluate((el) => {
    ;(el as unknown as { messages: unknown[] }).messages = [
      { id: "x", role: "assistant", parts: [{ type: "text", text: 'Hello <img src=x onerror="window.pwned=1"> **world**' }] },
    ]
  })
  await expect(log(page).locator("strong", { hasText: "world" })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined()
  await expect(log(page).locator("img")).toHaveCount(0)
})

test("answers have Copy, Retry and feedback; a suggestion sends itself", async ({ page }) => {
  await page.getByRole("toolbar", { name: "Suggestions" }).getByRole("button", { name: "Write the changelog" }).click()
  await expect(log(page).locator(".chat-message[data-from=user]")).toContainText("Write the changelog")
  const answer = log(page).locator(".chat-message[data-from=assistant]:not([data-streaming])").last()
  await expect(answer).toContainText("Publish the changelog")
  await page.locator("uiset-chat").evaluate((el) => el.addEventListener("feedbackchange", (e) => ((window as unknown as { fb: unknown }).fb = (e as CustomEvent).detail)))
  await answer.getByRole("button", { name: "Good response" }).click()
  expect(await page.evaluate(() => (window as unknown as { fb: { value: string } }).fb.value)).toBe("good")
  await answer.getByRole("button", { name: "Retry message" }).click()
  await expect(log(page).locator(".chat-message[data-from=assistant]")).toHaveCount(1)
  await expect(log(page).locator(".chat-message[data-from=assistant]").last()).toContainText("Publish the changelog")
})

// Every message has the same actions, so each one's names carry its message's first words: an
// agent pressing "Copy message" can tell which reply it copies.
test("each message's actions are named with its first words", async ({ page }) => {
  await page.locator("uiset-chat").evaluate((el) => {
    el.setAttribute("editable", "")
    ;(el as unknown as { messages: unknown[] }).messages = [
      { id: "q", role: "user", parts: [{ type: "text", text: "Can you summarize the **release notes** for me?" }] },
      { id: "a", role: "assistant", parts: [{ type: "text", text: "Here's a summary of the release, in three parts." }] },
      { id: "b", role: "assistant", parts: [{ type: "text", text: "Done." }] },
    ]
  })
  const names = (from: string) =>
    log(page).locator(`.chat-message[data-from=${from}] .chat-actions button`).evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label")))
  await expect.poll(() => names("user")).toEqual(['Edit message: "Can you summarize the release…"'])
  expect(await names("assistant")).toEqual([
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
test("with several replies on the page, the check still scores 100", async ({ page }) => {
  await page.locator("uiset-chat").evaluate((el) => {
    ;(el as unknown as { messages: unknown[] }).messages = [
      { id: "q", role: "user", parts: [{ type: "text", text: "How do I cancel a fetch?" }] },
      { id: "a", role: "assistant", parts: [{ type: "text", text: "Use an AbortController." }] },
      { id: "b", role: "assistant", parts: [{ type: "text", text: "Pass its signal to fetch." }] },
    ]
  })
  const toolbars = log(page).locator(".chat-message[data-from=assistant]").getByRole("toolbar")
  await expect(toolbars).toHaveCount(2)
  expect(await toolbars.evaluateAll((all) => all.map((el) => el.getAttribute("aria-label")))).toEqual(['Actions: "Use an AbortController."', 'Actions: "Pass its signal to fetch."'])
  await expect(log(page).getByRole("group", { name: 'Feedback: "Use an AbortController."' })).toHaveCount(1)
  await waitForAgent(page, { agent: "agent" })
  const report = await checkPage(page, { agent: "agent" })
  expect(report.score, formatAgentReadiness(report, "chat")).toBe(100)
})

test("while it answers, the composer shows Stop, and Stop ends the answer", { tag: "@engine" }, async ({ page }) => {
  await page.locator("uiset-chat-composer").evaluate((el) => el.addEventListener("stop", () => ((window as unknown as { stops: number }).stops = ((window as unknown as { stops?: number }).stops ?? 0) + 1)))
  await composer(page).fill("Go")
  await composer(page).press("Enter")
  const stop = page.getByRole("button", { name: "Stop" })
  await expect(stop).toBeVisible()
  await stop.click()
  expect(await page.evaluate(() => (window as unknown as { stops?: number }).stops)).toBe(1)
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible()
  // Up brings back what was sent.
  await composer(page).press("ArrowUp")
  await expect(composer(page)).toHaveValue("Go")
})

test("a tool call waiting on the person offers Allow and Deny, and reports the choice", async ({ page }) => {
  await page.locator("uiset-chat").evaluate((el) => {
    el.addEventListener("approve", (e) => ((window as unknown as { approved: unknown }).approved = (e as CustomEvent).detail))
    ;(el as unknown as { messages: unknown[] }).messages = [
      { id: "a", role: "assistant", parts: [{ type: "tool-deploy", title: "Deploy to production", state: "approval-requested", input: { env: "prod" } }] },
    ]
  })
  const tool = log(page).locator(".chat-tool")
  await expect(tool).toHaveAttribute("data-status", "approval")
  await expect(tool.getByRole("button", { name: "Allow" })).toHaveAttribute("data-agent-confirm", "Runs Deploy to production")
  await tool.getByRole("button", { name: "Deny" }).click()
  expect(await page.evaluate(() => (window as unknown as { approved: unknown }).approved)).toEqual({ value: false, id: "a", part: 0 })
})

test("the thread list selects, renames and deletes after asking", { tag: "@engine" }, async ({ page }) => {
  const threads = page.getByRole("navigation", { name: "Chats" })
  await threads.getByRole("button", { name: "Open Pricing page copy", exact: true }).click()
  await expect(threads.getByRole("button", { name: "Open Pricing page copy", exact: true })).toHaveAttribute("aria-current", "page")
  await threads.getByRole("button", { name: "More for Pricing page copy" }).click()
  await page.getByRole("menuitem", { name: "Rename" }).click()
  const rename = threads.getByRole("textbox", { name: "Rename Pricing page copy" })
  await rename.fill("Pricing copy v2")
  await rename.press("Enter")
  await expect(threads.getByRole("button", { name: "Open Pricing copy v2", exact: true })).toBeFocused()
  await threads.getByRole("button", { name: "More for Pricing copy v2" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete “Pricing copy v2”?" })
  await dialog.getByRole("button", { name: "Delete chat" }).click()
  await expect(threads.getByRole("button", { name: "Open Pricing copy v2", exact: true })).toHaveCount(0)
})

test("the log keeps each message's element: earlier messages aren't re-added, a streaming one changes in place", async ({ page }) => {
  await composer(page).fill("First")
  await composer(page).press("Enter")
  await expect(page.locator("uiset-chat .chat-message[data-from=assistant]:not([data-streaming])").last()).toContainText("Publish the changelog")
  // Watch the log while a second answer streams: what it removes is what a screen reader
  // would hear again.
  await page.locator("uiset-chat [role=log]").evaluate((log) => {
    const first = log.querySelector(".chat-message[data-from=user]")
    ;(window as unknown as { first: Element | null }).first = first
    const removed: string[] = []
    ;(window as unknown as { removed: string[] }).removed = removed
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.removedNodes) if (node instanceof Element && node.matches(".chat-message")) removed.push(node.getAttribute("data-id") ?? "?")
    }).observe(log, { childList: true })
  })
  await composer(page).fill("Second")
  await composer(page).press("Enter")
  await expect(page.locator("uiset-chat .chat-message[data-from=user]")).toHaveCount(2)
  await expect(page.locator("uiset-chat .chat-message[data-from=assistant]:not([data-streaming])").nth(1)).toContainText("Publish the changelog")
  const removed = await page.evaluate(() => (window as unknown as { removed: string[] }).removed.filter((id) => id !== "?"))
  expect(removed).toEqual([])
  expect(await page.evaluate(() => document.querySelector("uiset-chat .chat-message[data-from=user]") === (window as unknown as { first: Element }).first)).toBe(true)
})

test("links an answer carries can't run script, however they're written", async ({ page }) => {
  await page.locator("uiset-chat").evaluate((el) => {
    ;(el as unknown as { messages: unknown[] }).messages = [
      {
        id: "x",
        role: "assistant",
        parts: [
          { type: "text", text: "[a](javascript:alert(1)) [b](jav&#x61;script:alert(1)) <javascript:alert(1)> [c][r] [ok](https://example.com) [rel](/docs)\n\n[r]: javascript:alert(1)" },
          { type: "file", mediaType: "application/pdf", url: "javascript:alert(1)", filename: "bad.pdf" },
        ],
      },
    ]
  })
  await expect(log(page).getByRole("link", { name: /^ok/ })).toHaveAttribute("href", "https://example.com")
  const hrefs = await log(page).locator("a").evaluateAll((links) => links.map((a) => a.getAttribute("href")))
  expect(hrefs.filter((href) => href && /script/i.test(href))).toEqual([])
  await expect(log(page).getByRole("link", { name: "rel" })).toHaveAttribute("href", "/docs")
  await expect(log(page).getByText("bad.pdf")).toBeVisible()
})

test("a remote image in an answer is a link, unless the page allows it", async ({ page }) => {
  const requests: string[] = []
  page.on("request", (r) => r.url().includes("attacker.example") && requests.push(r.url()))
  await page.locator("uiset-chat").evaluate((el) => {
    ;(el as unknown as { messages: unknown[] }).messages = [{ id: "x", role: "assistant", parts: [{ type: "text", text: "![chart](https://attacker.example/c.png?secret=1)" }] }]
  })
  await expect(log(page).getByRole("link", { name: /Image: chart/ })).toHaveAttribute("href", "https://attacker.example/c.png?secret=1")
  expect(requests).toEqual([])
  await page.route("https://attacker.example/**", (route) => route.fulfill({ contentType: "image/png", body: Buffer.from("") }))
  await page.locator("uiset-chat").evaluate((el) => ((el as unknown as { allowImage: (u: URL) => boolean }).allowImage = (url) => url.hostname === "attacker.example"))
  await expect(log(page).locator('img[alt="chart"]')).toHaveCount(1)
})

test("properties set before the elements are defined still draw", async ({ page }) => {
  // A page whose own script sets the properties before UISet's module loads.
  await page.route("**/early-chat.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root><uiset-chat id="c" label="Early"></uiset-chat><uiset-chat-threads id="t"></uiset-chat-threads></uiset-root>
        <script>
          document.getElementById("c").messages = [{ id: "a", role: "assistant", parts: [{ type: "text", text: "Set **early**" }] }]
          document.getElementById("t").threads = [{ id: "t1", title: "First chat" }]
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-chat.html")
  await expect(page.locator("uiset-chat strong", { hasText: "early" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Open First chat", exact: true })).toBeVisible()
  // And later sets still reach the element.
  await page.evaluate(() => ((document.getElementById("c") as unknown as { messages: unknown[] }).messages = []))
  await expect(page.getByText("How can I help?")).toBeVisible()
})

test("while an answer streams, an open tool call, Wrap and focus stay as they were", { tag: "@engine" }, async ({ page }) => {
  // The page's model is held mid-answer, as if tokens keep coming.
  await page.locator("uiset-chat").evaluate((el) => {
    const chat = el as unknown as { messages: unknown[]; status: string }
    chat.status = "streaming"
    chat.messages = [{ id: "a", role: "assistant", parts: [{ type: "tool-x", title: "Look up", state: "output-available", output: { n: 1 } }, { type: "text", text: "```ts\nconst a = 1\n```\nmore", state: "streaming" }] }]
  })
  const answer = log(page).locator(".chat-message").first()
  await answer.getByRole("button", { name: /^Look up/ }).click()
  await answer.getByRole("button", { name: "Wrap lines" }).click()
  await answer.getByRole("button", { name: "Wrap lines" }).focus()
  for (let i = 0; i < 5; i++)
    await page.locator("uiset-chat").evaluate((el, n) => {
      const chat = el as unknown as { messages: unknown[] }
      chat.messages = [{ id: "a", role: "assistant", parts: [{ type: "tool-x", title: "Look up", state: "output-available", output: { n: 1 } }, { type: "text", text: `\`\`\`ts\nconst a = 1\n\`\`\`\nmore ${"word ".repeat(n + 1)}`, state: "streaming" }] }]
    }, i)
  await expect(answer.getByRole("region", { name: /Look up output/ })).toBeVisible()
  await expect(answer.locator(".chat-code")).toHaveAttribute("data-wrap", "")
  await expect(answer.getByRole("button", { name: "Wrap lines" })).toBeFocused()
})

test("the composer sends a FileList, and Enter sends when the menu finds nothing", { tag: "@engine" }, async ({ page }) => {
  await page.locator("uiset-chat-composer").evaluate((el) =>
    el.addEventListener("send", (e) => ((window as unknown as { sent: unknown }).sent = { isList: (e as CustomEvent).detail.files instanceof FileList, text: (e as CustomEvent).detail.text })),
  )
  await composer(page).fill("/xyz")
  // The menu's own "No matches" (UI SDK's page announcer says it too).
  await expect(page.locator("uiset-chat-composer").getByText("No matches")).toBeVisible()
  await composer(page).press("Enter")
  expect(await page.evaluate(() => (window as unknown as { sent: unknown }).sent)).toEqual({ isList: true, text: "/xyz" })
  await expect(composer(page)).toBeFocused()
})

test("the chat list keeps focus on what you chose, and a rename finished elsewhere leaves focus there", { tag: "@engine" }, async ({ page }) => {
  const threads = page.getByRole("navigation", { name: "Chats" })
  await threads.getByRole("button", { name: "Open Pricing page copy", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(threads.getByRole("button", { name: "Open Pricing page copy", exact: true })).toBeFocused()
  await threads.getByRole("button", { name: "More for Pricing page copy" }).click()
  await page.getByRole("menuitem", { name: "Rename" }).click()
  await threads.getByRole("textbox", { name: /Rename/ }).fill("Copy v3")
  await composer(page).click()
  await page.keyboard.type("hello")
  await expect(composer(page)).toHaveValue("hello")
  await expect(threads.getByRole("button", { name: "Open Copy v3", exact: true })).toBeVisible()
  // An update to the list while the delete dialog is open leaves the dialog alone.
  await threads.getByRole("button", { name: "More for Copy v3" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete “Copy v3”?" })
  await expect(dialog).toBeVisible()
  await page.locator("uiset-chat-threads").evaluate((el) => {
    const t = el as unknown as { threads: unknown[] }
    t.threads = [...t.threads]
  })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Keep it" })).toBeVisible()
})

test("the command menu shows each command's description under its name, as in React", async ({ page }) => {
  await composer(page).fill("/")
  const summarize = page.getByRole("option", { name: /^summarize/ })
  await expect(summarize.locator(".chat-menu-hint")).toHaveText("Sum up the conversation")
  await composer(page).fill("/pl")
  await expect(page.getByRole("option", { name: /^plan/ }).locator(".chat-menu-hint")).toHaveText("Make a step-by-step plan")
  await expect(page.getByRole("option", { name: /^summarize/ })).toHaveCount(0)
})
