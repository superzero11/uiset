import { screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, expect, test } from "vitest"
import { settle } from "./bridge"
import { openWebPage } from "./web-page"

// The content and form parts as web elements on the Content page (web/content.html), driven
// through the web agent bridge: the table, avatar group, count badge, code block, upload and the
// agent parts. Moved from tests/e2e/web/content.spec.ts.

const $ = (selector: string) => document.querySelector(selector) as HTMLElement

// The elements' modules load once per file, and the first load can take a while.
beforeAll(async () => {
  await import("@ui-sdk/web/button")
  await import("../../web/src/uiset")
}, 60_000)

afterEach(() => {
  document.body.innerHTML = ""
})

test("the table takes a framework's insert and remove, though the table now sits in its scroll area", async () => {
  await openWebPage("content.html", "content-demo.ts")
  const host = document.getElementById("invoices")!
  const table = host.querySelector("table")!
  const steps: string[] = []
  try {
    // What Vue does for a v-if on the table: remove it from where it put it, and put it back.
    host.removeChild(table)
    steps.push(`removed:${!host.contains(table)}`)
    host.insertBefore(table, null)
    steps.push(`inserted:${host.contains(table)}`)
  } catch (error) {
    steps.push(`threw: ${String(error)}`)
  }
  expect(steps).toEqual(["removed:true", "inserted:true"])
  await settle()
  expect(within(screen.getByRole("region", { name: "Invoices" })).getByRole("table")).toBe(table)
})

test("the avatar group shows max avatars and names the rest in words; new avatars join the count", async () => {
  await openWebPage("content.html", "content-demo.ts")
  const group = screen.getByRole("group", { name: "Reviewers" })
  // The ones past max are marked; the skin's CSS hides them.
  const showing = () => group.querySelectorAll("ui-avatar:not([data-overflow])")
  expect(showing()).toHaveLength(4)
  expect(within(group).getByRole("img", { name: "2 more" }).textContent).toBe("+2")
  const avatar = document.createElement("ui-avatar")
  avatar.innerHTML = "<ui-avatar-fallback>DK</ui-avatar-fallback>"
  document.getElementById("reviewers")!.append(avatar)
  await waitFor(() => expect(within(group).getByRole("img", { name: "3 more" }).textContent).toBe("+3"))
  // The count stays last, after the avatar that just arrived.
  expect(group.lastElementChild!.classList.contains("avatar-group-more")).toBe(true)
  group.setAttribute("max", "10")
  await settle()
  expect(within(group).queryAllByRole("img", { name: /more/ })).toHaveLength(0)
  expect(showing()).toHaveLength(6)
})

test("the count badge shows the count, 99+ past max, a dot, nothing at 0, and says what's counted", async () => {
  await openWebPage("content.html", "content-demo.ts")
  const inbox = $("#inbox") as HTMLElement & { count: number }
  expect(inbox.querySelector(".count-badge-count")?.textContent).toBe("3")
  expect(inbox.textContent).toContain("3 unread")
  const badges = document.querySelectorAll("uiset-count-badge")
  expect(badges[1]!.querySelector(".count-badge-count")?.textContent).toBe("99+")
  expect(badges[2]!.querySelector(".count-badge-count")?.hasAttribute("data-dot")).toBe(true)
  inbox.count = 0
  expect(inbox.querySelectorAll(".count-badge-count")).toHaveLength(0)
  expect(inbox.textContent).not.toContain("3 unread")
  inbox.setAttribute("show-zero", "")
  expect(inbox.querySelector(".count-badge-count")?.textContent).toBe("0")
})

test("a code block: its lines, a marked line, the caption and a copy button named for it", async () => {
  const bridge = await openWebPage("content.html", "content-demo.ts")
  const block = $("#snippet") as HTMLElement & { code: string }
  expect(block.querySelector(".code-block-title")?.textContent).toBe("app.tsx")
  within(block).getByRole("group", { name: "app.tsx code" })
  await waitFor(() => expect(block.querySelectorAll(".code-line")).toHaveLength(5))
  expect(block.querySelectorAll(".code-line")[2]!.hasAttribute("data-highlighted")).toBe(true)
  expect(bridge.entry("Copy app.tsx").actions).toContain("press")
  block.code = "one\ntwo\n"
  await waitFor(() => expect(block.querySelectorAll(".code-line")).toHaveLength(2))
  block.setAttribute("copy", "false")
  await settle()
  expect(within(block).queryAllByRole("button", { name: /Copy/ })).toHaveLength(0)
})

test("upload: `upload` and `value` set before the element upgrades are kept", async () => {
  await openWebPage("content.html", "content-demo.ts")
  // An element in a template's content isn't upgraded: what a framework sets on it then
  // is an own property, there when the element upgrades as it joins the page.
  const template = document.createElement("template")
  template.innerHTML = `<uiset-upload label="Early"></uiset-upload>`
  const el = template.content.firstElementChild as HTMLElement & { upload: unknown; value: File[] }
  let sent = ""
  el.upload = async (file: File) => {
    sent = file.name
  }
  el.value = [new File(["x"], "early.pdf", { type: "application/pdf" })]
  document.querySelector("main")!.append(document.adoptNode(el))
  await settle(300)
  expect({ sent, files: el.value.map((file) => file.name) }).toEqual({ sent: "early.pdf", files: ["early.pdf"] })
})

test("Agent parts: a tool waits for approval, a checkpoint restores, the queue removes and sends", async () => {
  const bridge = await openWebPage("content.html", "content-demo.ts")
  const run = $("#agent-run")
  const tool = () => [...run.querySelectorAll(".chat-tool")].find((el) => el.textContent?.includes("Deploy preview"))!
  expect(tool().getAttribute("data-status")).toBe("approval")
  expect(bridge.entry("Allow").confirm).toBe("Runs Deploy preview")
  await bridge.press("Deny")
  expect(tool().getAttribute("data-status")).toBe("denied")
  expect(bridge.entry(/^Restore Checkpoint/).confirm).toBe("Puts the conversation back to this checkpoint")
  // The person restores it.
  await bridge.press(/^Restore Checkpoint/)
  expect(bridge.asked).toEqual(["Puts the conversation back to this checkpoint"])
  expect($("#agent-note").textContent).toBe("Restored to the checkpoint.")
  expect(tool().getAttribute("data-status")).toBe("approval")
  expect(run.querySelector(".chat-subagent")?.getAttribute("data-status")).toBe("done")
  const queue = screen.getByRole("region", { name: "Queued messages" })
  await bridge.press("Remove from queue: Then open a pull request")
  expect(queue.textContent).toContain("1 queued")
  await bridge.press("Send now: Also check the French locale")
  expect($("#queue").hidden).toBe(true)
})
