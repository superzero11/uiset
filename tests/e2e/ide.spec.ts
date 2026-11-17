import { expect, test, type Page } from "@playwright/test"

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
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/templates?template=ide-app")
  await expect(ide(page)).toBeVisible()
})

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
  const problems = ide(page).getByRole("tabpanel", { name: /Problems/ })
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
  let result = await act([{ ref: "Project files", action: "setValue", args: ["src/config.ts"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(file(page, "config.ts")).toHaveAttribute("aria-selected", "true")
  // An agent's choice of a file opens it, so its editor is there to write in.
  await expect(tab(page, "config.ts")).toHaveAttribute("aria-selected", "true")
  result = await act([{ ref: "src/config.ts", action: "setValue", args: ['export const config = {}\n'] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(tab(page, "config.ts, unsaved")).toBeVisible()
})

test("in every skin the editor's text is drawn by its colors, not a skinned field over them", async ({ page }) => {
  test.slow() // one page load per skin and theme
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    await page.goto(`/templates?template=ide-app&skin=${skin}&theme=dark`)
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

test.describe("review fixes", () => {
  const shownEditor = (page: Page) => ide(page).locator('[role="tabpanel"]:not([hidden])').getByRole("textbox")

  test("closing the last tab focuses the empty pane, so ⌘S stays the IDE's", async ({ page }) => {
    await tab(page, "index.ts").focus()
    await page.keyboard.press("Delete")
    await expect(tab(page, /index\.ts/)).toHaveCount(0)
    await expect(ide(page).locator(".ide-editor-empty")).toBeFocused()
  })

  test("Cancel on an unsaved close keeps that file shown and its tab focused", async ({ page }) => {
    await file(page, "config.ts").click()
    await tab(page, "index.ts").click()
    await caretAt(page, "src/index.ts", "end")
    await page.keyboard.type("x")
    await tab(page, "index.ts, unsaved").focus()
    await page.keyboard.press("Delete")
    await page.getByRole("alertdialog", { name: "Save changes to index.ts?" }).getByRole("button", { name: "Cancel" }).click()
    await expect(tab(page, "index.ts, unsaved")).toHaveAttribute("aria-selected", "true")
    await expect(tab(page, "index.ts, unsaved")).toBeFocused()
    await expect(shownEditor(page)).toHaveAccessibleName("src/index.ts")
  })

  test("deleting the open file shows the next tab's editor, and Close all keeps unsaved files shown", async ({ page }) => {
    await file(page, "config.ts").click()
    await file(page, "index.ts").click()
    await page.keyboard.press("Delete")
    await page.getByRole("alertdialog", { name: "Delete index.ts?" }).getByRole("button", { name: "Delete" }).click()
    await expect(tab(page, "config.ts")).toHaveAttribute("aria-selected", "true")
    await expect(shownEditor(page)).toHaveAccessibleName("src/config.ts")
    await caretAt(page, "src/config.ts", "end")
    await page.keyboard.type("// draft")
    await page.keyboard.press("ControlOrMeta+Shift+p")
    await page.keyboard.type("close all")
    await page.keyboard.press("Enter")
    await expect(tab(page, "config.ts, unsaved")).toHaveAttribute("aria-selected", "true")
    await expect(shownEditor(page)).toBeVisible()
  })

  test("switching tabs keeps each editor's caret and undo", async ({ page }) => {
    await file(page, "config.ts").click()
    await tab(page, "index.ts").click()
    await caretAt(page, "src/index.ts", 20)
    await page.keyboard.type("abc")
    await tab(page, "config.ts").click()
    await tab(page, "index.ts, unsaved").click()
    const caret = await editor(page, "src/index.ts").evaluate((el: HTMLTextAreaElement) => el.selectionStart)
    expect(caret).toBe(23)
    await editor(page, "src/index.ts").focus()
    await page.keyboard.press("ControlOrMeta+z")
    await expect(editor(page, "src/index.ts")).not.toHaveValue(/abc/)
  })

  test("typing undoes as one step, and colors stay while you type", async ({ page }) => {
    const shown = ide(page).locator('[role="tabpanel"]:not([hidden])')
    await expect(shown.locator(".ide-code-colors span[style]").first()).toBeVisible()
    await caretAt(page, "src/index.ts", "end")
    await page.keyboard.type("const word = 1")
    expect(await shown.locator(".ide-code-colors span[style]").count()).toBeGreaterThan(5)
    await page.keyboard.press("ControlOrMeta+z")
    await expect(editor(page, "src/index.ts")).not.toHaveValue(/const w/)
  })

  test("the palette returns focus where you were, and Escape closes it in any mode", async ({ page }) => {
    await caretAt(page, "src/index.ts", 5)
    await page.keyboard.press("ControlOrMeta+Shift+p")
    await expect(page.getByRole("dialog", { name: "Run a command" })).toBeVisible()
    // ⌘P inside switches to files, rather than printing.
    await page.keyboard.press("ControlOrMeta+p")
    await expect(page.getByRole("dialog", { name: "Go to file" })).toBeVisible()
    await page.keyboard.press("ControlOrMeta+Shift+p")
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(editor(page, "src/index.ts")).toBeFocused()
  })

  test("F2 and Delete act on the focused item, not the selected one", async ({ page }) => {
    await file(page, "index.ts").click()
    await file(page, "lib").focus()
    await page.keyboard.press("Delete")
    await expect(page.getByRole("alertdialog", { name: "Delete lib?" })).toBeVisible()
    await page.keyboard.press("Escape")
  })

  test("Page Down moves the caret; Escape, a click, then Tab still indents", async ({ page }) => {
    await caretAt(page, "src/index.ts", "start")
    await page.keyboard.press("PageDown")
    await expect(status(page)).not.toContainText("Ln 1,")
    await page.keyboard.press("Escape")
    await editor(page, "src/index.ts").click()
    const before = await editor(page, "src/index.ts").inputValue()
    await page.keyboard.press("Tab")
    await expect(editor(page, "src/index.ts")).toBeFocused()
    expect((await editor(page, "src/index.ts").inputValue()).length).toBe(before.length + 2)
  })

  test("code stays left to right and untranslated, and a folder's ring is on its row", async ({ page }) => {
    await expect(ide(page).locator(".ide-code").first()).toHaveAttribute("dir", "ltr")
    await expect(ide(page).locator(".ide-code").first()).toHaveAttribute("translate", "no")
    await file(page, "lib").focus()
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("ArrowUp")
    const rings = await file(page, "lib").evaluate((el) => [
      getComputedStyle(el).outlineStyle,
      getComputedStyle(el.querySelector('[data-slot="tree-label"]')!).outlineStyle,
    ])
    expect(rings, JSON.stringify(rings)).toEqual(["none", "solid"])
  })
})

test("selected code keeps 4.5:1 in every skin and theme", async ({ page }) => {
  test.slow() // one page load per skin and theme
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    for (const theme of ["light", "dark"]) {
      if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme as "light" | "dark" })
      await page.goto(`/templates?template=ide-app&skin=${skin}&theme=${theme}`)
      const shown = ide(page).locator('[role="tabpanel"]:not([hidden])')
      await expect(shown.locator(".ide-code-colors span[style]").first()).toBeVisible()
      const worst = await shown.locator(".ide-code").evaluate((code) => {
        const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
        const rgba = (color: string) => {
          pen.clearRect(0, 0, 1, 1)
          pen.fillStyle = color
          pen.fillRect(0, 0, 1, 1)
          const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data
          return [r!, g!, b!, a! / 255]
        }
        const lum = ([r, g, b]: number[]) =>
          [r!, g!, b!]
            .map((v) => {
              const s = v / 255
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            })
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0)
        let surface = getComputedStyle(code).backgroundColor
        for (let el: Element | null = code; el && rgba(surface)[3] === 0; el = el.parentElement) surface = getComputedStyle(el).backgroundColor
        const base = rgba(surface)
        const tint = rgba(getComputedStyle(code.querySelector("textarea")!, "::selection").backgroundColor)
        const selected = base.slice(0, 3).map((c, i) => c * (1 - tint[3]!) + tint[i]! * tint[3]!)
        const colors = new Set([...code.querySelectorAll<HTMLElement>(".ide-code-colors span[style]")].map((s) => getComputedStyle(s).color))
        const ratio = (fg: number[]) => {
          const [x, y] = [lum(fg), lum(selected)].sort((m, n) => n - m)
          return (x! + 0.05) / (y! + 0.05)
        }
        return Math.min(...[...colors].map((c) => ratio(rgba(c))))
      })
      expect(worst, `${skin} ${theme}`).toBeGreaterThanOrEqual(4.5)
    }
  }
})
