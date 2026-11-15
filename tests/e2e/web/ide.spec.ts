import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// The IDE as web elements, on a page with no React: the React IDE template's project,
// joined from the file tree, editor tabs, code editors, palette, problems and status bar.

const ide = (page: Page) => page.locator(".template-ide")
const tree = (page: Page) => ide(page).getByRole("tree", { name: "Files" })
const file = (page: Page, name: string | RegExp) => tree(page).getByRole("treeitem", { name })
const editor = (page: Page, path: string) => ide(page).getByRole("textbox", { name: path, exact: true })
const tab = (page: Page, name: string | RegExp) => ide(page).getByRole("tab", { name })
const status = (page: Page) => ide(page).getByRole("group", { name: "Status" })
// Home and End shortcuts differ by platform; tests place the caret directly.
const caretAt = (page: Page, path: string, where: "start" | "end" | number) =>
  editor(page, path).evaluate((el: HTMLTextAreaElement, at) => {
    const offset = at === "start" ? 0 : at === "end" ? el.value.length : at
    el.focus()
    el.setSelectionRange(offset, offset)
  }, where)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/ide.html")
  await expect(editor(page, "src/index.ts")).toBeVisible()
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the IDE page passes axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await page.waitForTimeout(500)
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("open a file from the tree; its code shows in colors, line for line", async ({ page }) => {
  await file(page, "greet.ts").click()
  await expect(tab(page, "greet.ts")).toHaveAttribute("aria-selected", "true")
  await expect(editor(page, "src/lib/greet.ts")).toHaveValue(/export function greet/)
  const shown = ide(page).locator('[role="tabpanel"]:not([hidden])')
  await expect(shown.locator(".ide-code-colors span[style]").first()).toBeVisible()
  const gutter = await shown.locator(".ide-code-number").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top))
  const lines = await shown.locator(".ide-code-line").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top))
  expect(gutter.slice(0, 5)).toEqual(lines.slice(0, 5))
})

test("Tab indents, Enter keeps the indent, Escape then Tab leaves the editor", async ({ page }) => {
  const code = editor(page, "src/index.ts")
  await caretAt(page, "src/index.ts", "end")
  await page.keyboard.type("function hi() {")
  await page.keyboard.press("Enter")
  await page.keyboard.type("return 1")
  await expect(code).toHaveValue(/function hi\(\) \{\n  return 1\n?/)
  await caretAt(page, "src/index.ts", (await code.inputValue()).lastIndexOf("\n") + 1)
  await page.keyboard.press("Tab")
  await expect(code).toHaveValue(/\n    return 1/)
  await page.keyboard.press("Shift+Tab")
  await expect(code).toHaveValue(/\n  return 1/)
  // Undo is the browser's own: each edit was one native insert.
  await page.keyboard.press("ControlOrMeta+z")
  await expect(code).toHaveValue(/\n    return 1/)
  await page.keyboard.press("Escape")
  await page.keyboard.press("Tab")
  await expect(code).not.toBeFocused()
})

test("an edit marks the tab unsaved and the file modified; ⌘S saves", async ({ page }) => {
  await caretAt(page, "src/index.ts", "end")
  await page.keyboard.type("// done")
  await expect(tab(page, "index.ts, unsaved")).toBeVisible()
  await expect(file(page, "index.ts, modified")).toBeVisible()
  await expect(file(page, /^src, has changes/)).toBeVisible()
  await page.keyboard.press("ControlOrMeta+s")
  await expect(tab(page, "index.ts")).toHaveAccessibleName("index.ts")
  await expect(file(page, "index.ts, modified")).toBeVisible()
})

test("the palette opens files, runs commands after >, and goes to a line after :", async ({ page }) => {
  await editor(page, "src/index.ts").click()
  await page.keyboard.press("ControlOrMeta+p")
  const palette = page.getByRole("dialog", { name: "Go to file" })
  await expect(palette).toBeVisible()
  await page.keyboard.type("fmt")
  await expect(palette.getByRole("option").first()).toContainText("format.ts")
  await page.keyboard.press("Enter")
  await expect(tab(page, "format.ts")).toHaveAttribute("aria-selected", "true")

  await page.keyboard.press("ControlOrMeta+p")
  await page.keyboard.type(":3")
  await page.keyboard.press("Enter")
  await expect(status(page)).toContainText("Ln 3, Col 1")
  await expect(editor(page, "src/lib/format.ts")).toBeFocused()

  await page.keyboard.press("ControlOrMeta+Shift+p")
  await expect(page.getByRole("dialog", { name: "Run a command" })).toBeVisible()
  await page.keyboard.type("close editor")
  await page.keyboard.press("Enter")
  await expect(tab(page, "format.ts")).toHaveCount(0)
})

test("problems: choosing one opens its file at the line; F8 walks them", async ({ page }) => {
  const problems = ide(page).getByRole("region", { name: /Problems/ })
  await problems.getByRole("button", { name: /Error: Expected "}"/ }).click()
  await expect(tab(page, "format.ts")).toHaveAttribute("aria-selected", "true")
  await expect(status(page)).toContainText("Ln 6")
  await tab(page, "index.ts").click()
  await caretAt(page, "src/index.ts", "start")
  await page.keyboard.press("F8")
  await expect(status(page)).toContainText("Ln 4, Col 4")
  await page.keyboard.press("F8")
  await expect(status(page)).toContainText("Ln 7, Col 1")
})

test("new file, rename with F2, and delete with focus kept in the tree", async ({ page }) => {
  await file(page, "lib").click()
  await ide(page).getByRole("button", { name: "New file" }).click()
  let dialog = page.getByRole("dialog", { name: "New file" })
  await dialog.getByRole("textbox", { name: "Name" }).fill("greet.ts")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(dialog.getByText("greet.ts already exists there.")).toBeVisible()
  await dialog.getByRole("textbox", { name: "Name" }).fill("time.ts")
  await dialog.getByRole("button", { name: "Create" }).click()
  await expect(file(page, "time.ts, untracked")).toBeFocused()
  await expect(tab(page, "time.ts")).toBeVisible()

  await page.keyboard.press("F2")
  dialog = page.getByRole("dialog", { name: "Rename time.ts" })
  await dialog.getByRole("textbox", { name: "Name" }).fill("clock.ts")
  await dialog.getByRole("button", { name: "Rename" }).click()
  await expect(file(page, "clock.ts, untracked")).toBeFocused()
  await expect(tab(page, "clock.ts")).toBeVisible()

  await page.keyboard.press("Delete")
  await page.getByRole("alertdialog", { name: "Delete clock.ts?" }).getByRole("button", { name: "Delete" }).click()
  await expect(file(page, /^clock\.ts/)).toHaveCount(0)
  await expect(tree(page).getByRole("treeitem").and(page.locator(":focus"))).toHaveCount(1)
  await expect(tab(page, /^clock\.ts/)).toHaveCount(0)
})

test("Delete on a tab closes it; closing an unsaved file asks first", async ({ page }) => {
  await file(page, "config.ts").click()
  await tab(page, "config.ts").focus()
  await page.keyboard.press("Delete")
  await expect(tab(page, "config.ts")).toHaveCount(0)
  await expect(tab(page, "index.ts")).toBeFocused()

  await editor(page, "src/index.ts").click()
  await page.keyboard.type("x")
  await tab(page, "index.ts, unsaved").focus()
  await page.keyboard.press("Delete")
  const ask = page.getByRole("alertdialog", { name: "Save changes to index.ts?" })
  await ask.getByRole("button", { name: "Cancel" }).click()
  await expect(tab(page, "index.ts, unsaved")).toBeVisible()
})

test("agents open files and edit code by the names people see", async ({ page }) => {
  type Act = { ok: boolean; error?: { message: string } }
  const act = (steps: unknown[]) =>
    page.evaluate((s) => (window as unknown as { agent: { act: (x: unknown) => Promise<Act> } }).agent.act({ steps: s }), steps)
  let result = await act([{ ref: "Files", action: "setValue", args: ["src/config.ts"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(file(page, "config.ts")).toHaveAttribute("aria-selected", "true")
  // An agent's choice of a file opens it, so its editor is there to write in.
  await expect(tab(page, "config.ts")).toHaveAttribute("aria-selected", "true")
  result = await act([{ ref: "src/config.ts", action: "setValue", args: ['export const config = {}\n'] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(tab(page, "config.ts, unsaved")).toBeVisible()
})

test("in every skin the editor's text is drawn by its colors, not a skinned field over them", async ({ page }) => {
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    await page.locator("uiset-root").evaluate((el, s) => (el.setAttribute("skin", s), el.setAttribute("theme", "dark")), skin)
    const code = editor(page, "src/index.ts")
    const look = await code.evaluate((el) => {
      const style = getComputedStyle(el)
      return [style.backgroundColor, style.color, style.borderBottomWidth, style.boxShadow]
    })
    expect(look, skin).toEqual(["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)", "0px", "none"])
  }
})

test("the file actions menu works from the keyboard", async ({ page }) => {
  await file(page, "config.ts").click()
  const more = ide(page).getByRole("button", { name: "More file actions for config.ts" })
  await more.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("menuitem", { name: /Rename/ }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog", { name: "Rename config.ts" })).toBeVisible()
})

test("properties set before the elements are defined are picked up", async ({ page }) => {
  await page.route("**/early-ide.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root>
          <uiset-file-tree id="t" label="Early files"></uiset-file-tree>
          <uiset-editor-tabs id="e"></uiset-editor-tabs>
          <uiset-problems id="p"></uiset-problems>
        </uiset-root>
        <script>
          document.getElementById("t").paths = ["a.ts", "b/"]
          document.getElementById("t").status = { "a.ts": "modified" }
          const e = document.getElementById("e")
          e.files = [{ path: "a.ts", dirty: true }]
          e.renderPanel = (path) => Object.assign(document.createElement("p"), { textContent: "Panel for " + path })
          document.getElementById("p").problems = [{ path: "a.ts", line: 2, severity: "error", message: "Early problem" }]
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-ide.html")
  await expect(page.getByRole("treeitem", { name: "a.ts, modified" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "a.ts, unsaved" })).toBeVisible()
  await expect(page.getByText("Panel for a.ts")).toBeVisible()
  await expect(page.getByRole("button", { name: /Error: Early problem/ })).toBeVisible()
})

test("Move puts a file in another folder, and a refused rename says why", async ({ page }) => {
  await file(page, "config.ts").click()
  await ide(page).getByRole("button", { name: "More file actions for config.ts" }).click()
  await page.getByRole("menuitem", { name: "Move to…" }).click()
  const dialog = page.getByRole("dialog", { name: "Move config.ts" })
  await dialog.getByRole("combobox", { name: "Folder" }).click()
  await page.getByRole("option", { name: "src/lib" }).click()
  await dialog.getByRole("button", { name: "Move" }).click()
  await expect(file(page, /^config\.ts/)).toBeFocused()
  expect(await tree(page).locator('[data-path="src/lib/config.ts"]').count()).toBe(1)
  // The page can refuse a change, with its reason in the dialog.
  await page.locator("uiset-file-tree").evaluate((el) => el.addEventListener("rename", (e) => (e as CustomEvent<{ refuse: (m: string) => void }>).detail.refuse("That name is taken by a build step.")))
  await page.keyboard.press("F2")
  const rename = page.getByRole("dialog", { name: /^Rename/ })
  await rename.getByRole("textbox", { name: "Name" }).fill("settings.ts")
  await rename.getByRole("button", { name: "Rename" }).click()
  await expect(rename.getByRole("alert")).toHaveText("That name is taken by a build step.")
})

test("Escape closes the palette and returns to where you were, even with > typed", async ({ page }) => {
  await editor(page, "src/index.ts").click()
  await page.keyboard.press("ControlOrMeta+Shift+p")
  await expect(page.getByRole("dialog", { name: "Run a command" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(editor(page, "src/index.ts")).toBeFocused()
})

test("the tree keeps focus as it redraws; a run of typing is one undo step", async ({ page }) => {
  await file(page, "config.ts").focus()
  await page.locator("uiset-file-tree").evaluate((el) => ((el as unknown as { status: Record<string, string> }).status = { "src/config.ts": "modified" }))
  await expect(file(page, "config.ts, modified")).toBeFocused()
  const code = editor(page, "src/index.ts")
  await caretAt(page, "src/index.ts", "end")
  const before = await code.inputValue()
  await page.keyboard.type("abc")
  await page.keyboard.press("ControlOrMeta+z")
  await expect(code).toHaveValue(before)
  // A change from outside (a command, an agent) is a step too, which the browser's own
  // undo can't take back.
  await page.locator("uiset-code-editor").first().evaluate((el, text) => ((el as unknown as { value: string }).value = `${text}// from outside\n`), before)
  await code.focus()
  await page.keyboard.press("ControlOrMeta+z")
  await expect(code).toHaveValue(before)
})
