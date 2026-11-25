import { render, within } from "@solidjs/testing-library"
import { beforeAll, expect, test } from "vitest"
import { IdeTemplate } from "@/solid/src/templates/ide-app"
import { UISet } from "@/solid/src/uiset"
import { createSolidBridge, settle } from "./solid-bridge"

// The IDE template in Solid (solid/src/templates/ide-app.tsx, the IDE kit's page), driven
// through the agent bridge with React's assertions (tests/unit/ide.bridge.test.tsx).

const bridge = createSolidBridge()

// jsdom has no matchMedia; the IDE asks whether the screen is narrow. A wide one, here.
beforeAll(() => {
  window.matchMedia ??= ((media: string) => ({ matches: false, media, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia
})

// The whole IDE is a big page for jsdom: role queries stay within the tree and the tab list.
test("agents open files and edit code by the names people see", { timeout: 20_000 }, async () => {
  const { container } = render(() => (
    <UISet>
      <IdeTemplate />
    </UISet>
  ))
  await settle()
  const ide = container.querySelector<HTMLElement>(".template-ide")!
  const file = (name: RegExp) => within(ide.querySelector<HTMLElement>("[role=tree]")!).getByRole("treeitem", { name })
  const tab = (name: string | RegExp) => within(ide.querySelector<HTMLElement>("[role=tablist]")!).getByRole("tab", { name })

  let result = await bridge.run("Project files", "setValue", "src/config.ts")
  expect(result.ok, result.error?.message).toBe(true)
  expect(file(/config\.ts/).getAttribute("aria-selected")).toBe("true")
  // An agent's choice of a file opens it, so its editor is there to write in.
  expect(tab(/config\.ts/).getAttribute("aria-selected")).toBe("true")
  result = await bridge.run("src/config.ts", "setValue", "export const config = {}\n")
  expect(result.ok, result.error?.message).toBe(true)
  await settle(100)
  expect(tab("config.ts, unsaved")).toBeTruthy()
  expect(bridge.entry("src/config.ts").value).toBe("export const config = {}\n")
})
