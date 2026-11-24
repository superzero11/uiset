import { waitFor } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import type { ChatMessage } from "@/web/src/chat"

// Footnotes in Web Components: each message's own, in each chat. The prefix was the message's
// number, so two chats on a page, or two text parts in one message, shared ids, and every
// footnotes' heading was "footnote-label".

afterEach(() => {
  document.body.innerHTML = ""
})

test("two chats' answers with the same footnote keep their ids, links and headings apart", async () => {
  await import("../../web/src/uiset")
  const note = "A claim.[^1]\n\n[^1]: The source."
  const answer = (id: string): ChatMessage => ({ id, role: "assistant", parts: [{ type: "text", text: note }, { type: "text", text: note }] })
  document.body.innerHTML = "<uiset-root><uiset-chat></uiset-chat><uiset-chat></uiset-chat></uiset-root>"
  for (const chat of document.querySelectorAll<HTMLElement & { messages: ChatMessage[] }>("uiset-chat")) chat.messages = [answer("a1")]
  await waitFor(() => expect(document.querySelectorAll("section[data-footnotes]")).toHaveLength(4), { timeout: 5000 })
  const ids = [...document.querySelectorAll(".chat-message [id]")].map((el) => el.id)
  expect(new Set(ids).size).toBe(ids.length)
  const refs = [...document.querySelectorAll<HTMLAnchorElement>("a[data-footnote-ref]")]
  expect(refs).toHaveLength(4)
  for (const ref of refs) {
    const part = ref.closest(".chat-response")!
    expect(part.querySelector(`[id="${ref.getAttribute("href")!.slice(1)}"]`)).toBeTruthy()
    expect(part.querySelector(`[id="${ref.getAttribute("aria-describedby")}"]`)?.textContent).toBe("Footnotes")
  }
  for (const back of document.querySelectorAll<HTMLAnchorElement>("a[data-footnote-backref]")) {
    expect(back.closest(".chat-response")!.querySelector(`[id="${back.getAttribute("href")!.slice(1)}"]`)?.hasAttribute("data-footnote-ref")).toBe(true)
    expect(back.getAttribute("aria-label")).toBe("Back to reference 1")
  }
})
