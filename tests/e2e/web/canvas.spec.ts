import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// The Canvas as web elements, on a page with no React: an agent workflow with a toolbar and
// an inspector beside it, and undo through the canvas's `history`.
const canvas = (page: Page) => page.getByRole("group", { name: "Workflow", exact: true })
const node = (page: Page, name: string | RegExp) => canvas(page).getByRole("option", { name })
const wires = (page: Page) => canvas(page).locator('path[data-slot="canvas-wire"]')
const tools = (page: Page) => page.getByRole("toolbar", { name: "Canvas tools" })
const inspector = (page: Page) => page.locator("uiset-canvas-inspector")
const tick = (page: Page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]>
}
const act = (page: Page, action: string, ...args: unknown[]) =>
  page.evaluate(([a, s]) => (window as unknown as { agent: Agent }).agent.act({ steps: [{ ref: "Workflow", action: a, args: s }] }), [action, args] as const)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/canvas.html")
  await expect(node(page, /^Reply/)).toBeVisible()
  await tick(page)
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Canvas page passes axe in ${skin}, ${theme}`, async ({ page, browserName }) => {
      test.fixme(browserName === "firefox", "Playwright's Firefox crashes (signal 11) while automation inspects this page; normal use doesn't (HISTORY.md decision log, 2026-11-15)")
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await node(page, /^Draft answer/).focus()
      await page.keyboard.press("Space")
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("drag a node: it moves, its wires follow as it goes, and Undo puts it back", async ({ page }) => {
  const search = node(page, /^Search docs/)
  const before = (await search.boundingBox())!
  const wireBefore = await wires(page).evaluateAll((paths) => paths.map((p) => p.getAttribute("d")))
  await page.mouse.move(before.x + 60, before.y + 12)
  await page.mouse.down()
  await page.mouse.move(before.x + 80, before.y + 50, { steps: 6 })
  await page.mouse.move(before.x + 100, before.y + 92, { steps: 6 })
  expect(await wires(page).evaluateAll((paths) => paths.map((p) => p.getAttribute("d")))).not.toEqual(wireBefore)
  await page.mouse.up()
  expect((await search.boundingBox())!.y - before.y).toBeGreaterThan(40)
  await tools(page).getByRole("button", { name: "Undo" }).click()
  await expect.poll(async () => (await search.boundingBox())!.y).toBeCloseTo(before.y, 0)
})

test("arrows go to the nearest node that way; Alt with arrows moves it", async ({ page }) => {
  await node(page, /^Draft answer/).focus()
  await page.keyboard.press("ArrowRight")
  await expect(node(page, /^Reply/)).toBeFocused()
  const before = (await node(page, /^Reply/).boundingBox())!
  await page.keyboard.press("Alt+ArrowDown")
  await page.keyboard.press("Alt+ArrowDown")
  await expect.poll(async () => (await node(page, /^Reply/).boundingBox())!.y).toBeGreaterThan(before.y + 5)
  await expect(node(page, /^Reply/)).toBeFocused()
})

test("Space selects; Delete removes, focus moves on, and Control+Z brings it back with its wires", async ({ page }) => {
  await node(page, /^Search docs/).focus()
  await page.keyboard.press("Space")
  await expect(node(page, /^Search docs/)).toHaveAttribute("aria-selected", "true")
  await expect(inspector(page).getByRole("heading", { name: "Search docs" })).toBeVisible()
  await page.keyboard.press("Delete")
  await expect(node(page, /^Search docs/)).toHaveCount(0)
  await expect(canvas(page).getByRole("option").and(page.locator(":focus"))).toHaveCount(1)
  await expect(wires(page)).toHaveCount(3)
  await page.keyboard.press("ControlOrMeta+z")
  await expect(node(page, /^Search docs/)).toBeVisible()
  await expect(wires(page)).toHaveCount(5)
})

test("Shift-drag across empty space selects a box; the toolbar removes both", async ({ page }) => {
  const a = (await node(page, /^Answer template/).boundingBox())!
  const b = (await node(page, /^Search docs/).boundingBox())!
  await page.keyboard.down("Shift")
  await page.mouse.move(a.x - 20, a.y - 12)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width + 12, b.y + b.height + 12, { steps: 10 })
  await page.mouse.up()
  await page.keyboard.up("Shift")
  await expect(node(page, /^Answer template/)).toHaveAttribute("aria-selected", "true")
  await expect(node(page, /^Search docs/)).toHaveAttribute("aria-selected", "true")
  await tools(page).getByRole("button", { name: "Remove 2 nodes" }).click()
  await expect(canvas(page).getByRole("option")).toHaveCount(3)
  // Focus stays on the page's controls, never the body.
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true)
})

test("C starts a wire from the keyboard; the inspector disconnects and hands focus on", async ({ page }) => {
  await node(page, /^Reply/).focus()
  await page.keyboard.press("Space")
  await inspector(page).getByRole("button", { name: /^Disconnect Draft answer · Text from Reply · Text/ }).click()
  await expect(wires(page)).toHaveCount(4)
  await expect(node(page, /^Reply/)).toBeFocused()
  await node(page, /^Draft answer/).focus()
  await page.keyboard.press("c")
  await expect(canvas(page).locator('[data-connect="source"]')).toHaveCount(1)
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await expect(wires(page)).toHaveCount(5)
  await expect(node(page, /^Reply/)).toHaveAccessibleDescription(/Inputs: Text from Draft answer Text/)
})

test("drag from an output port to an input port to wire them; the handle disconnects", async ({ page }) => {
  await canvas(page).locator('g[data-slot="canvas-unwire"]').last().click()
  await expect(wires(page)).toHaveCount(4)
  const from = (await canvas(page).locator('[data-slot="canvas-port"][data-canvas-port="out"]').nth(3).boundingBox())!
  const to = (await node(page, /^Reply/).locator('[data-canvas-port="in"]').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x - 30, to.y, { steps: 8 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 4 })
  await page.mouse.up()
  await expect(wires(page)).toHaveCount(5)
})

test("zoom with the buttons and keys, pan by dragging empty space", async ({ page }) => {
  const readout = canvas(page).locator("[data-canvas-zoom]")
  const start = await readout.getAttribute("data-zoom")
  // `fit-view` framed every node as the page opened.
  expect(start).not.toBe("100%")
  for (const name of [/^User question/, /^Reply/]) await expect(node(page, name)).toBeInViewport()
  await canvas(page).getByRole("button", { name: "Zoom in" }).click()
  await expect(readout).not.toHaveAttribute("data-zoom", start!)
  await canvas(page).getByRole("button", { name: /^Zoom \d+%/ }).click()
  await expect(readout).toHaveAttribute("data-zoom", "100%")
  await node(page, /^Reply/).focus()
  await page.keyboard.press("-")
  await expect(readout).not.toHaveAttribute("data-zoom", "100%")
  const world = canvas(page).locator('[data-slot="canvas-world"]')
  const before = await world.evaluate((el) => (el as HTMLElement).style.transform)
  const frame = (await canvas(page).boundingBox())!
  await page.mouse.move(frame.x + 30, frame.y + frame.height - 140)
  await page.mouse.down()
  await page.mouse.move(frame.x + 130, frame.y + frame.height - 100, { steps: 8 })
  await page.mouse.up()
  expect(await world.evaluate((el) => (el as HTMLElement).style.transform)).not.toBe(before)
})

test("Add node puts a new node in view and focuses it; Undo removes it without dropping focus", async ({ page }) => {
  await tools(page).getByRole("button", { name: "Add node" }).click()
  await page.getByRole("menuitem", { name: "Tool" }).click()
  await expect(node(page, /^New tool/)).toBeFocused()
  await expect(node(page, /^New tool/)).toBeInViewport()
  await page.keyboard.press("ControlOrMeta+z")
  await expect(node(page, /^New tool/)).toHaveCount(0)
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true)
})

test("the new node takes focus in the same task as the closing menu hands it back", async ({ page }) => {
  await tools(page).getByRole("button", { name: "Add node" }).click()
  // Where focus is once the task in which the menu returns it to Add node is done, before
  // the next frame: a focus put off to a later frame would still be on its way.
  await tools(page).getByRole("button", { name: "Add node" }).evaluate((button) => {
    ;(window as unknown as { settled: Promise<string | null> }).settled = new Promise((done) =>
      button.addEventListener("focusin", () => setTimeout(() => done(document.activeElement?.getAttribute("aria-roledescription") ?? null)), { once: true }),
    )
  })
  await page.getByRole("menuitem", { name: "Tool" }).click()
  expect(await page.evaluate(() => (window as unknown as { settled: Promise<string | null> }).settled)).toBe("node")
  await expect(node(page, /^New tool/)).toBeFocused()
})

test("Enter on a node puts focus in its notes in the same task", async ({ page }) => {
  await node(page, /^Draft answer/).focus()
  const focused = await node(page, /^Draft answer/).evaluate((el) => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
    return new Promise<string | null>((done) => setTimeout(() => done(document.activeElement?.tagName.toLowerCase() ?? null)))
  })
  expect(focused).toBe("textarea")
  await expect(inspector(page).getByRole("textbox", { name: "Notes" })).toBeFocused()
})

test("the inspector renames the node shown, keeps fields per node, and Enter opens notes", async ({ page }) => {
  await node(page, /^Draft answer/).focus()
  await page.keyboard.press("Enter")
  await expect(inspector(page).getByRole("textbox", { name: "Notes" })).toBeFocused()
  await expect(inspector(page).getByRole("textbox", { name: "Notes" })).toHaveValue("Fast model, temperature 0.2")
  await inspector(page).getByRole("textbox", { name: "Title" }).fill("Draft reply")
  await inspector(page).getByRole("button", { name: "Rename" }).click()
  await expect(node(page, /^Draft reply/)).toBeVisible()
  await expect(inspector(page).getByRole("heading", { name: "Draft reply" })).toBeVisible()
  // One undo takes the rename back.
  await tools(page).getByRole("button", { name: "Undo" }).click()
  await expect(node(page, /^Draft answer/)).toBeVisible()
  // Another node gets its own fields.
  await node(page, /^Reply/).click()
  await expect(inspector(page).getByRole("textbox", { name: "Notes" })).toHaveValue("Sent to the chat")
})

test("agents add, wire, move and select nodes by name, and read them", async ({ page }) => {
  expect((await act(page, "addNode", "Output", "Log")).ok).toBe(true)
  expect((await act(page, "connect", "Draft answer", "Log")).ok).toBe(true)
  expect((await act(page, "connect", "Draft answer", "Draft answer")).error?.message).toMatch(/can't connect/)
  expect((await act(page, "moveNode", "Log", 900, 320)).ok).toBe(true)
  expect((await act(page, "select", "Log", "Reply")).ok).toBe(true)
  await expect(node(page, /^Log/)).toHaveAttribute("aria-selected", "true")
  const items = await page.evaluate(async () => (await (window as unknown as { agent: Agent }).agent.query({ within: "Workflow" })).find((c) => c.label === "Workflow")?.items?.map((i) => i.label))
  expect(items).toEqual(expect.arrayContaining([expect.stringMatching(/^Log \(at 900, 320; Inputs: Text from Draft answer Text\.\)/)]))
})

test("without openable, history or controls the canvas does without them", async ({ page }) => {
  const el = page.locator("uiset-canvas")
  await el.evaluate((c) => (c.removeAttribute("openable"), c.removeAttribute("history"), c.setAttribute("controls", "false")))
  await expect(canvas(page).getByRole("group", { name: "Zoom" })).toBeHidden()
  await expect(tools(page).getByRole("button", { name: "Undo" })).toBeHidden()
  expect((await act(page, "openNode", "Reply")).ok).toBe(false)
  await node(page, /^Reply/).focus()
  await page.keyboard.press("Enter")
  await expect(inspector(page).getByRole("textbox", { name: "Notes" })).toHaveCount(0)
})

test("a refused change leaves the canvas as it was; the page's description stays", async ({ page }) => {
  const el = page.locator("uiset-canvas")
  await el.evaluate((c) => c.addEventListener("nodeschange", (e) => e.preventDefault()))
  await node(page, /^Search docs/).focus()
  await page.keyboard.press("Delete")
  await expect(node(page, /^Search docs/)).toBeVisible()
  await el.evaluate((c) => {
    c.before(Object.assign(document.createElement("p"), { id: "flow-note", textContent: "Runs on every chat message." }))
    c.setAttribute("aria-describedby", "flow-note")
  })
  await expect(canvas(page)).toHaveAccessibleDescription(/^Runs on every chat message\. Arrow keys go to the nearest node/)
})

test("properties set before the elements are defined draw once they are", async ({ page }) => {
  await page.route("**/early-canvas.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root><uiset-canvas id="c" label="Early flow"></uiset-canvas><uiset-canvas-inspector for="c"></uiset-canvas-inspector></uiset-root>
        <script>
          const c = document.getElementById("c")
          c.nodes = [{ id: "a", title: "Early node", x: 40, y: 40, outputs: [{ id: "o", label: "Out" }] }, { id: "b", title: "Later node", x: 320, y: 40, inputs: [{ id: "i", label: "In" }] }]
          c.edges = [{ id: "a->b", from: "a:out:o", to: "b:in:i" }]
          c.renderNode = (n) => n.id === "a" ? "First" : null
          document.querySelector("uiset-canvas-inspector").renderFields = (n) => Object.assign(document.createElement("p"), { textContent: "Fields for " + n.title })
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-canvas.html")
  const flow = page.getByRole("group", { name: "Early flow", exact: true })
  await expect(flow.getByRole("option", { name: /^Early node/ })).toBeVisible()
  await expect(flow.locator('path[data-slot="canvas-wire"]')).toHaveCount(1)
  await expect(flow.getByText("First")).toBeVisible()
  await flow.getByRole("option", { name: /^Later node/ }).click()
  await expect(page.getByText("Fields for Later node")).toBeVisible()
})

test("pressing the minimap looks elsewhere", async ({ page }) => {
  const world = canvas(page).locator('[data-slot="canvas-world"]')
  const before = await world.evaluate((el) => (el as HTMLElement).style.transform)
  const map = (await canvas(page).locator(".canvas-minimap svg").boundingBox())!
  await page.mouse.click(map.x + 8, map.y + 8)
  await expect.poll(() => world.evaluate((el) => (el as HTMLElement).style.transform)).not.toBe(before)
})
