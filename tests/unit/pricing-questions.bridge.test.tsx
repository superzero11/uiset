import { cleanup, render } from "@testing-library/react"
import { createAgent as createWebAgent } from "@ui-sdk/web/agent"
import { afterEach, expect, test } from "vitest"
import { PricingTemplate } from "@/registry/uiset/ui/templates/pricing"
import { UISet } from "@/registry/uiset/ui/uiset"
import { createBridge, settle } from "./bridge"
import { openWebPage } from "./web-page"

// An agent opens a pricing question by its words, and query lists the questions by their words
// too. Their values were q0 to q3, which query reported as their labels (2026-11-21).

const question = "What counts as a seat?"

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

async function check(bridge: ReturnType<typeof createBridge>) {
  const faq = bridge.entry("Pricing questions")
  const found = await bridge.agent.query({ within: faq.ref })
  const items = Array.isArray(found) ? (found[0] as { items?: { label?: string }[] }).items : undefined
  expect(items?.map((item) => item.label)).toContain(question)
  expect((await bridge.run("Pricing questions", "open", question)).ok).toBe(true)
  expect(bridge.entry("Pricing questions").value).toEqual([question])
}

test("React: an agent opens a pricing question by its words", async () => {
  const bridge = createBridge()
  render(
    <UISet>
      <PricingTemplate />
    </UISet>,
  )
  await settle()
  await check(bridge)
})

test("web: an agent opens a pricing question by its words", async () => {
  await check(await openWebPage("templates/pricing.html", "templates/pricing.ts"))
}, 60_000)
