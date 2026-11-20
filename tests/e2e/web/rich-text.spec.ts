import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// The rich text editor as web elements, on a page with no React: the same editing, menus,
// toolbar and agent bridge as RichTextEditor, from UI SDK's own elements.
const editor = (page: Page) => page.getByRole("textbox", { name: "Release notes" })
const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Release notes formatting" })
const lineEnd = process.platform === "darwin" ? "Meta+ArrowRight" : "End"

async function clear(page: Page) {
  await editor(page).click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.press("Backspace")
  await expect(editor(page)).toHaveAttribute("data-empty", "")
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/rich-text.html")
  await expect(editor(page).getByRole("heading", { name: "Release 2.4" })).toBeVisible()
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`passes axe in ${skin}, ${theme}, with the "/" menu open`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await editor(page).getByText("Before we ship").click()
      await page.keyboard.press(lineEnd)
      await page.keyboard.press("Enter")
      await page.keyboard.type("/")
      await expect(page.getByRole("option", { name: /Heading 2/ })).toBeVisible()
      const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]
      const report = (r: Awaited<ReturnType<AxeBuilder["analyze"]>>) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)
      expect(report(await new AxeBuilder({ page }).withTags(tags).exclude(".rich-text-menu").analyze())).toEqual([])
      // The menu scrolls where there's little room (here, below the caret). It's a listbox
      // the arrow keys move through, scrolling the highlighted item into view, which axe's
      // scrolling rule can't see, so that one rule is checked by keys instead.
      expect(report(await new AxeBuilder({ page }).withTags(tags).include(".rich-text-menu").disableRules(["scrollable-region-focusable"]).analyze())).toEqual([])
      await page.keyboard.press("ArrowUp")
      await expect(page.getByRole("option", { name: /Divider/ })).toBeInViewport()
    })
  }
}

test("Markdown as you type, and the page hears each change as Markdown", async ({ page }) => {
  await clear(page)
  await page.keyboard.type("## Plan")
  await page.keyboard.press("Enter")
  await page.keyboard.type("- [ ] ship it")
  await expect(editor(page).getByRole("heading", { level: 2, name: "Plan" })).toBeVisible()
  await expect(editor(page).getByRole("checkbox", { name: "ship it" })).toHaveAttribute("aria-checked", "false")
  await expect(page.locator("#markdown")).toHaveText("## Plan\n\n- [ ] ship it")
  // The preview is the read-only element, drawn from the same document.
  await expect(page.locator("#preview").getByRole("heading", { level: 2, name: "Plan" })).toBeVisible()
  await expect(page.locator("#preview").getByRole("img", { name: "Not done" })).toHaveCount(1)
})

test('"/" turns the line into a block; "@" mentions a person as one unit', async ({ page }) => {
  await clear(page)
  await page.keyboard.type("/quo")
  const quote = page.getByRole("option", { name: /Quote/ })
  await expect(quote).toBeVisible()
  await expect(quote).toContainText("Set text apart")
  await page.keyboard.press("Enter")
  await page.keyboard.type("Thanks @gra")
  await page.getByRole("option", { name: "Grace Hopper" }).click()
  await expect(editor(page).locator("blockquote")).toHaveText("Thanks @Grace Hopper ")
  await expect(editor(page).locator(".rich-text-mention")).toHaveAttribute("data-mention", "grace")
})

test("the toolbar marks text, shows what's on, and keeps focus in the text", async ({ page }) => {
  await clear(page)
  await page.keyboard.type("make this loud")
  for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+ArrowLeft")
  const bold = toolbar(page).getByRole("button", { name: "Bold" })
  await bold.click()
  await expect(editor(page).locator("strong")).toHaveText("loud")
  await expect(bold).toHaveAttribute("aria-pressed", "true")
  await expect(editor(page)).toBeFocused()
  const blockType = toolbar(page).getByRole("combobox", { name: "Block type" })
  await expect(blockType).toHaveText(/Text/)
  await blockType.click()
  await page.getByRole("option", { name: "Heading 3" }).click()
  await expect(editor(page).getByRole("heading", { level: 3 })).toHaveText("make this loud")
  // Choosing a block type hands focus back to the text, a frame later.
  await expect(editor(page)).toBeFocused()
  // One Tab stop: arrows move along the toolbar, the select included.
  await blockType.focus()
  await page.keyboard.press("ArrowRight")
  await expect(bold).toBeFocused()
})

test("Mod+K links the selection; unsafe addresses are refused", async ({ page }) => {
  await clear(page)
  await page.keyboard.type("read the docs")
  for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+ArrowLeft")
  await page.keyboard.press("ControlOrMeta+k")
  const dialog = page.getByRole("dialog", { name: "Add a link" })
  const address = dialog.getByRole("textbox", { name: "Link address" })
  await expect(address).toBeFocused()
  await address.fill("javascript:alert(1)")
  await address.press("Enter")
  await expect(dialog.getByRole("alert")).toContainText("Use a web address")
  await address.fill("example.com/docs")
  await address.press("Enter")
  await expect(dialog).toBeHidden()
  await expect(editor(page).locator("a")).toHaveText("docs")
  await expect(editor(page).locator("a")).toHaveAttribute("href", "https://example.com/docs")
  await expect(editor(page)).toBeFocused()
  await expect(toolbar(page).getByRole("button", { name: "Link" })).toHaveAttribute("aria-pressed", "true")
})

test("agents read the editor as Markdown and write it; undo takes an agent's edit back", async ({ page }) => {
  type Agent = {
    act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
    snapshot: () => { label?: string; value?: unknown; actions?: string[] }[]
  }
  const read = () => page.evaluate(() => (window as unknown as { agent: Agent }).agent.snapshot().filter((c) => c.label?.startsWith("Release notes")))
  const seen = await read()
  expect(seen).toHaveLength(1)
  expect(seen[0]!.actions).toEqual(["setValue", "insert", "clear"])
  expect(String(seen[0]!.value)).toContain("### Before we ship")
  const act = (steps: unknown[]) => page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)
  const set = await act([{ ref: "Release notes", action: "setValue", args: ["## From an agent\n\n- one"] }])
  expect(set.ok, set.error?.message).toBe(true)
  await expect(editor(page).getByRole("heading", { level: 2, name: "From an agent" })).toBeVisible()
  await expect(page.locator("#markdown")).toHaveText("## From an agent\n\n- one")
  await editor(page).click()
  await page.keyboard.press(lineEnd)
  await page.keyboard.type(" two")
  await expect.poll(async () => String((await read())[0]!.value)).toContain("- one two")
  await page.keyboard.press("ControlOrMeta+z")
  await page.keyboard.press("ControlOrMeta+z")
  await expect(editor(page).getByRole("heading", { name: "Release 2.4" })).toBeVisible()
})

test("in a form it submits HTML; read-only hides the toolbar and refuses edits", async ({ page }) => {
  const field = page.locator('uiset-rich-text input[type="hidden"][name="notes"]')
  await expect(field).toHaveValue(/^<h2>Release 2\.4<\/h2>/)
  await page.locator("#notes").evaluate((el) => el.setAttribute("format", "markdown"))
  await expect(field).toHaveValue(/^## Release 2\.4/)
  await page.locator("#notes").evaluate((el) => el.setAttribute("readonly", ""))
  await expect(toolbar(page)).toBeHidden()
  await expect(editor(page)).toHaveAttribute("aria-readonly", "true")
  await editor(page).click()
  await page.keyboard.type("nope")
  await expect(editor(page)).not.toContainText("nope")
  const refused = await page.evaluate(() =>
    (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean }> } }).agent.act({ steps: [{ ref: "Release notes", action: "clear" }] }),
  )
  expect(refused.ok).toBe(false)
  await expect(editor(page).getByRole("heading", { name: "Release 2.4" })).toBeVisible()
})

test.describe("review fixes", () => {
  test("uploadImage set after the editor is on the page adds the image button", async ({ page }) => {
    await expect(toolbar(page).getByRole("button", { name: "Insert image" })).toHaveCount(0)
    await page.locator("#notes").evaluate((el) => ((el as HTMLElement & { uploadImage: unknown }).uploadImage = async () => null))
    await expect(toolbar(page).getByRole("button", { name: "Insert image" })).toBeVisible()
  })

  test("moved in the page, the editor keeps its text and works", async ({ page }) => {
    await clear(page)
    await page.keyboard.type("kept")
    await page.locator("#notes").evaluate((el) => {
      const parent = el.parentElement!
      el.remove()
      parent.prepend(el)
    })
    await expect(editor(page)).toHaveText("kept")
    await editor(page).click()
    await page.keyboard.press("End")
    await page.keyboard.type("!")
    await expect(editor(page)).toContainText("kept")
  })

  test("a read-only editor stays in the Tab order for reading", async ({ page }) => {
    await page.locator("#notes").evaluate((el) => el.setAttribute("readonly", ""))
    await expect(editor(page)).toHaveAttribute("tabindex", "0")
    await expect(editor(page)).toHaveAttribute("contenteditable", "false")
  })
})
