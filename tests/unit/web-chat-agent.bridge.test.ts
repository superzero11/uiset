import { screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest"
import { openWebPage } from "./web-page"

// The agent's turn and the queue as web elements: the Chat page's pretend model and the Chat
// app template's sample assistant, each asked to fix something, driven through the web agent
// bridge. Moved from tests/e2e/web/chat-agent.spec.ts.

const deploy = () => [...document.querySelectorAll<HTMLElement>("uiset-chat .chat-tool")].find((el) => el.textContent?.includes("Deploy a preview"))
const log = () => screen.getByRole("log").textContent

// jsdom has no DataTransfer: the composer hands its files on as one's FileList.
beforeAll(() => {
  globalThis.DataTransfer ??= class {
    #files: File[] = []
    items = { add: (file: File) => void this.#files.push(file) }
    get files() {
      return this.#files as unknown as FileList
    }
  } as unknown as typeof DataTransfer
})
afterEach(() => {
  document.body.innerHTML = ""
})

for (const [name, html, script] of [
  ["the Chat page", "chat.html", "chat-demo.ts"],
  ["the Chat app template", "templates/chat-app.html", "templates/chat-app.ts"],
] as const) {
  describe(name, { timeout: 20_000 }, () => {
    let bridge: Awaited<ReturnType<typeof openWebPage>>
    // The first page also loads the element modules: the hook waits longer than the default.
    beforeEach(async () => {
      bridge = await openWebPage(html, script)
      await bridge.press("Suggestions", "Fix the date format and deploy a preview")
      await waitFor(() => expect(deploy()?.dataset.status).toBe("approval"), { timeout: 10_000 })
    }, 30_000)

    test("a checkpoint and a subagent's run show, and the deploy runs once allowed", async () => {
      // Waiting for a person isn't writing: no caret under the approval.
      expect(document.querySelectorAll("uiset-chat .chat-message[data-streaming]")).toHaveLength(0)
      expect(bridge.find(/^Restore Before the fix/)).toBeDefined()
      expect(bridge.find("Researcher, Find where the date format comes from, Done in 4s")).toBeDefined()
      expect(bridge.entry("Allow").confirm).toBe("Runs Deploy a preview")
      await bridge.press("Allow")
      await waitFor(() => expect(deploy()?.dataset.status).toBe("done"), { timeout: 10_000 })
      await waitFor(() => expect(log()).toContain("The preview is up"), { timeout: 10_000 })
    })

    test("denied, it doesn't deploy", async () => {
      await bridge.press("Deny")
      await waitFor(() => expect(deploy()?.dataset.status).toBe("denied"))
      await waitFor(() => expect(log()).toContain("Okay, no preview."))
    })

    test("written while it waits, a message is queued and goes when the answer is done", async () => {
      // Typed as a person types it (jsdom can't insert at a caret), then queued by its button.
      const box = screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement
      box.value = "Then open a pull request"
      box.dispatchEvent(new Event("input", { bubbles: true }))
      await bridge.press("Queue")
      const queue = () => screen.queryByRole("region", { name: "Queued messages" })
      await waitFor(() => expect(queue()?.textContent).toContain("1 queued"))
      await bridge.press("Allow")
      await waitFor(() => expect(queue()).toBeNull(), { timeout: 10_000 })
      const sent = document.querySelectorAll("uiset-chat .chat-message[data-from='user']")
      expect(sent[sent.length - 1]!.textContent).toContain("Then open a pull request")
    })

    test("Restore cuts the answer back to its checkpoint", async () => {
      await bridge.press(/^Restore Before the fix/)
      await waitFor(() => expect(deploy()).toBeUndefined())
      expect(bridge.find("Send")).toBeDefined()
    })
  })
}
