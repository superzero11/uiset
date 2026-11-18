import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const section = (page: Page) => page.locator(".item-frame")
const editor = (page: Page) => section(page).getByRole("textbox", { name: "Release notes" })
const toolbar = (page: Page) => section(page).getByRole("toolbar", { name: "Release notes formatting" })
const markdown = async (page: Page) => {
  await section(page).getByRole("tab", { name: "Markdown" }).click()
  return (await section(page).locator(".editor-demo-source").textContent()) ?? ""
}

async function choose(page: Page, group: string, option: string) {
  // The skin is the site's select; the theme a radio group.
  if (group === "Skin") {
    await page.getByRole("combobox", { name: "Site skin", exact: true }).click()
    await page.getByRole("option", { name: option, exact: true }).click()
  } else await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: option }).click()
}

// macOS moves to a line's ends with Cmd+arrows (Home and End scroll there).
const lineStart = process.platform === "darwin" ? "Meta+ArrowLeft" : "Home"
const lineEnd = process.platform === "darwin" ? "Meta+ArrowRight" : "End"

/** Empties the editor and leaves the caret in it. */
async function clear(page: Page) {
  await editor(page).click()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.press("Backspace")
  await expect(editor(page)).toHaveAttribute("data-empty", "")
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/docs/kits/rich-text")
  await expect(editor(page).getByRole("heading", { name: "Release 2.4" })).toBeVisible()
})

for (const skin of ["Base", "Blueprint", "Studio", "Phosphor", "Ink"]) {
  for (const theme of ["Light", "Dark"]) {
    test(`passes axe in ${skin} ${theme.toLowerCase()}, with the "/" menu open`, async ({ page }) => {
      await choose(page, "Skin", skin)
      await choose(page, "Theme", theme)
      await editor(page).getByText("Before we ship").click()
      await page.keyboard.press(lineEnd)
      await page.keyboard.press("Enter")
      await page.keyboard.type("/")
      await expect(page.getByRole("option", { name: "Heading 2" })).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include(".item-frame")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])
    })
  }
}

test("Markdown as you type makes headings, lists, nesting, quotes and marks", async ({ page }) => {
  await clear(page)
  await page.keyboard.type("# Plan")
  await page.keyboard.press("Enter")
  await page.keyboard.type("- first")
  await page.keyboard.press("Enter")
  await page.keyboard.type("second")
  await page.keyboard.press("Tab")
  // Enter on an empty item steps out a level, then out of the list.
  await page.keyboard.press("Enter")
  await page.keyboard.press("Enter")
  await page.keyboard.press("Enter")
  await page.keyboard.type("> quoted")
  // A quote continues like a list; Enter on its empty line ends it.
  await page.keyboard.press("Enter")
  await page.keyboard.press("Enter")
  await page.keyboard.type("Some **bold** and `code` here")

  await expect(editor(page).getByRole("heading", { level: 1, name: "Plan" })).toBeVisible()
  const items = editor(page).getByRole("listitem")
  await expect(items).toHaveCount(2)
  await expect(items.nth(1)).toHaveAttribute("aria-level", "2")
  await expect(editor(page).locator("blockquote")).toHaveText("quoted")
  await expect(editor(page).locator("strong")).toHaveText("bold")
  await expect(editor(page).locator("p code")).toHaveText("code")
  expect(await markdown(page)).toBe("# Plan\n\n- first\n  - second\n\n> quoted\n\nSome **bold** and `code` here")
})

test("Enter on an empty list item ends the list; Backspace at its start lifts it", async ({ page }) => {
  await clear(page)
  await page.keyboard.type("1. one")
  await page.keyboard.press("Enter")
  await page.keyboard.type("two")
  await expect(editor(page).locator("ol li")).toHaveCount(2)
  await expect(editor(page).locator("ol li").nth(1)).toHaveAttribute("value", "2")
  await page.keyboard.press("Enter")
  await page.keyboard.press("Enter")
  await page.keyboard.type("after")
  await expect(editor(page).locator("ol li")).toHaveCount(2)
  await expect(editor(page).locator("p", { hasText: "after" })).toBeVisible()
})

test("the toolbar and shortcuts mark text, and show what's on at the caret", async ({ page }) => {
  await clear(page)
  await page.keyboard.type("make this loud")
  await page.keyboard.press("Shift+ArrowLeft")
  for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowLeft")
  const bold = toolbar(page).getByRole("button", { name: "Bold" })
  await bold.click()
  await expect(editor(page).locator("strong")).toHaveText("loud")
  await expect(bold).toHaveAttribute("aria-pressed", "true")
  await expect(editor(page)).toBeFocused()
  await page.keyboard.press("ControlOrMeta+i")
  await expect(editor(page).locator("em")).toHaveText("loud")
  await page.keyboard.press(lineStart)
  await expect(bold).toHaveAttribute("aria-pressed", "false")
  // The block menu reads and changes the block at the caret.
  const blockType = toolbar(page).getByRole("combobox", { name: "Block type" })
  await expect(blockType).toHaveText(/Text/)
  await blockType.click()
  await page.getByRole("option", { name: "Heading 2" }).click()
  await expect(editor(page).getByRole("heading", { level: 2 })).toHaveText("make this loud")
})

test('"/" turns the line into a block, and leaves no "/" behind', async ({ page }) => {
  await clear(page)
  await page.keyboard.type("/quo")
  await expect(page.getByRole("option", { name: /Quote/ })).toBeVisible()
  await expect(page.getByRole("option", { name: /Heading/ })).toHaveCount(0)
  await page.keyboard.press("Enter")
  await expect(editor(page).locator("blockquote")).toHaveCount(1)
  await page.keyboard.type("Wise words")
  await expect(editor(page).locator("blockquote")).toHaveText("Wise words")
  // "/" mid-sentence is just a slash.
  await page.keyboard.type(" and/or")
  await expect(page.locator('[data-slot="trigger-menu-content"]')).toHaveCount(0)
})

test('"@" mentions a person as one unit', async ({ page }) => {
  await clear(page)
  await page.keyboard.type("Thanks @gra")
  await page.getByRole("option", { name: "Grace Hopper" }).click()
  const chip = editor(page).locator(".rich-text-mention")
  await expect(chip).toHaveText("@Grace Hopper")
  await expect(chip).toHaveAttribute("data-mention", "grace")
  await page.keyboard.type("for the review")
  await expect(editor(page)).toContainText("Thanks @Grace Hopper for the review")
  for (let i = 0; i < "for the review".length + 1; i++) await page.keyboard.press("Backspace")
  await expect(chip).toHaveCount(1)
  await page.keyboard.press("Backspace")
  await expect(chip).toHaveCount(0)
  await expect(editor(page)).toHaveText("Thanks ")
})

test('in a list, Tab picks from an open "@" menu instead of nesting the item', async ({ page }) => {
  await clear(page)
  await page.keyboard.type("- Notes")
  await page.keyboard.press("Enter")
  await page.keyboard.type("Thanks @gra")
  await expect(page.getByRole("option", { name: "Grace Hopper" })).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(editor(page).locator(".rich-text-mention")).toHaveText("@Grace Hopper")
  await expect(editor(page).getByRole("listitem").nth(1)).toHaveAttribute("aria-level", "1")
  // With the menu closed, Tab nests the item as usual.
  await page.keyboard.press("Tab")
  await expect(editor(page).getByRole("listitem").nth(1)).toHaveAttribute("aria-level", "2")
})

test("undo and redo step through edits, from the keyboard and the toolbar", async ({ page }) => {
  await clear(page)
  await page.keyboard.type("hello")
  await page.waitForTimeout(800)
  await page.keyboard.type(" world")
  await page.keyboard.press("ControlOrMeta+z")
  await expect(editor(page)).toHaveText("hello")
  await toolbar(page).getByRole("button", { name: "Undo" }).click()
  await expect(editor(page)).toHaveAttribute("data-empty", "")
  await page.keyboard.press("ControlOrMeta+Shift+z")
  await expect(editor(page)).toHaveText("hello")
  await toolbar(page).getByRole("button", { name: "Redo" }).click()
  await expect(editor(page)).toHaveText("hello world")
})

test("pasting a web page keeps its structure and drops what's unsafe", async ({ page, browserName }) => {
  test.skip(browserName === "firefox", "Firefox empties the data of a paste event made by a script")
  await clear(page)
  await editor(page).evaluate((el) => {
    const data = new DataTransfer()
    data.setData("text/html", '<h2>Pasted</h2><ul><li>one <b>bold</b></li><li>two</li></ul><script>window.pwned = 1</script><p><a href="javascript:alert(1)">bad</a> <a href="https://example.com">good</a></p><img src=x onerror="window.pwned = 1">')
    data.setData("text/plain", "Pasted\none bold\ntwo\nbad good")
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }))
  })
  await expect(editor(page).getByRole("heading", { level: 2, name: "Pasted" })).toBeVisible()
  await expect(editor(page).locator("li")).toHaveCount(2)
  await expect(editor(page).locator("li strong")).toHaveText("bold")
  await expect(editor(page).locator("a")).toHaveCount(1)
  await expect(editor(page).locator("a")).toHaveAttribute("href", /^https:\/\/example\.com\/?$/)
  await expect(editor(page).locator("script, img")).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { pwned?: number }).pwned)).toBeUndefined()
})

test("pasting Markdown text turns it into blocks", async ({ page, browserName }) => {
  test.skip(browserName === "firefox", "Firefox empties the data of a paste event made by a script")
  await clear(page)
  await editor(page).evaluate((el) => {
    const data = new DataTransfer()
    data.setData("text/plain", "## Notes\n\n- [ ] ship it\n- [x] test it")
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }))
  })
  await expect(editor(page).getByRole("heading", { level: 2, name: "Notes" })).toBeVisible()
  await expect(editor(page).getByRole("checkbox")).toHaveCount(2)
  await expect(editor(page).getByRole("checkbox", { name: "test it" })).toHaveAttribute("aria-checked", "true")
})

test("Mod+K adds a link to the selection, refuses unsafe addresses, and removes it", async ({ page }) => {
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
  await expect(editor(page).locator("a")).toHaveCount(0)
  await address.fill("https://example.com/docs")
  await address.press("Enter")
  await expect(dialog).toBeHidden()
  await expect(editor(page).locator("a")).toHaveText("docs")
  await expect(editor(page).locator("a")).toHaveAttribute("href", "https://example.com/docs")
  await expect(editor(page)).toBeFocused()
  // With the caret inside the link, the same button edits or removes it.
  await page.keyboard.press("ArrowLeft")
  await toolbar(page).getByRole("button", { name: "Link" }).click()
  await page.getByRole("dialog", { name: "Edit link" }).getByRole("button", { name: "Remove link" }).click()
  await expect(editor(page).locator("a")).toHaveCount(0)
  await expect(editor(page)).toHaveText("read the docs")
})

test("a to-do's box checks it off, by pointer, by a screen reader's click and by Mod+Enter", async ({ page }) => {
  // Named by its task; its state is aria-checked.
  const box = editor(page).getByRole("checkbox", { name: "Record the demo" })
  const item = editor(page).locator("li", { hasText: "Record the demo" })
  await expect(box).toHaveAttribute("aria-checked", "false")
  await box.click()
  await expect(item).toHaveAttribute("data-checked", "true")
  await expect(editor(page).getByRole("checkbox", { name: "Record the demo" })).toHaveAttribute("aria-checked", "true")
  // Assistive tech activates with a click and no pointer.
  await editor(page).getByRole("checkbox", { name: "Record the demo" }).evaluate((el) => (el as HTMLElement).click())
  await expect(item).toHaveAttribute("data-checked", "false")
  await editor(page).getByRole("checkbox", { name: "Record the demo" }).click()
  await expect(item).toHaveAttribute("data-checked", "true")
  await item.click()
  await page.keyboard.press("ControlOrMeta+Enter")
  await expect(item).toHaveAttribute("data-checked", "false")
  expect(await markdown(page)).toContain("- [ ] Record the demo")
})

test("agents read the editor as Markdown and write it the same way", async ({ page }) => {
  type Result = { ok: boolean; error?: { message: string } }
  type Agent = {
    act: (x: unknown) => Promise<Result>
  }
  const value = await page.evaluate(() =>
    (window as unknown as { agent: { snapshot: () => { label?: string; value?: unknown; actions?: string[] }[] } }).agent
      .snapshot()
      .filter((c) => c.label?.startsWith("Release notes")),
  )
  // One component by that name (the toolbar is for people), read as Markdown.
  expect(value).toHaveLength(1)
  expect(value[0]!.actions).toEqual(["setValue", "insert", "clear"])
  expect(String(value[0]!.value)).toContain("## Release 2.4")
  // What a person types is what an agent reads next.
  await editor(page).getByText("Before we ship").click()
  await page.keyboard.press(lineEnd)
  await page.keyboard.type(" today")
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { agent: { snapshot: () => { label?: string; value?: unknown }[] } }).agent.snapshot().find((c) => c.label === "Release notes")?.value))
    .toContain("### Before we ship today")
  // The name finds the editor alone.
  const found = await page.evaluate(() => (window as unknown as { agent: { query: (q: unknown) => Promise<unknown> } }).agent.query({ within: "Release notes" }))
  expect(found).not.toHaveProperty("error")
  const act = (steps: unknown[]) => page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)
  const set = await act([{ ref: "Release notes", action: "setValue", args: ["## From an agent\n\n- one\n- two"] }])
  expect(set.ok, set.error?.message).toBe(true)
  await expect(editor(page).getByRole("heading", { level: 2, name: "From an agent" })).toBeVisible()
  await expect(editor(page).locator("li")).toHaveCount(2)
  const added = await act([{ ref: "Release notes", action: "insert", args: ["Signed, the agent"] }])
  expect(added.ok, added.error?.message).toBe(true)
  await expect(editor(page).locator("p").last()).toHaveText("Signed, the agent")
  // A person undoes an agent's edit like their own.
  await editor(page).click()
  await page.keyboard.press("ControlOrMeta+z")
  await expect(editor(page).locator("p", { hasText: "Signed, the agent" })).toHaveCount(0)
})

test("the count says when the text is over the limit, in words", async ({ page }) => {
  const count = section(page).locator(".rich-text-count")
  await expect(count).toHaveText(/^\d+ \/ 2000 characters$/)
  await editor(page).getByText("Before we ship").click()
  await page.keyboard.insertText("x".repeat(2100))
  await expect(count).toHaveText(/over the limit of 2000 characters/)
  await expect(count).toHaveAttribute("data-over", "true")
  await expect(editor(page)).toHaveAttribute("aria-describedby", (await count.getAttribute("id"))!)
})

test.describe("review fixes", () => {
  test("Escape closes the link popover and keeps the selection", async ({ page }) => {
    await clear(page)
    await page.keyboard.type("ship it")
    await page.keyboard.press(lineStart)
    for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+ArrowRight")
    await page.keyboard.press("ControlOrMeta+k")
    await expect(page.getByRole("dialog", { name: "Add a link" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(editor(page)).toBeFocused()
    await page.keyboard.type("send")
    await expect(editor(page)).toHaveText("send it")
  })

  test('Enter still makes a new line when "/" or "@" matches nothing', async ({ page }) => {
    await clear(page)
    await page.keyboard.type("/usr")
    await page.keyboard.press("Enter")
    await page.keyboard.type("next")
    await expect(editor(page).locator("p")).toHaveText(["/usr", "next"])
  })

  test("a link typed at the caret is checked like a selected one", async ({ page }) => {
    await clear(page)
    await page.keyboard.type("see ")
    await page.keyboard.press("ControlOrMeta+k")
    const address = page.getByRole("dialog", { name: "Add a link" }).getByRole("textbox", { name: "Link address" })
    await address.fill("javascript:alert(1)")
    await address.press("Enter")
    await expect(page.getByRole("dialog", { name: "Add a link" }).getByRole("alert")).toBeVisible()
    await address.fill("example.com")
    await address.press("Enter")
    await expect(editor(page).locator("a")).toHaveAttribute("href", "https://example.com/")
  })

  test("Enter twice at the end of a code block leaves it", async ({ page }) => {
    await editor(page).locator("pre").click()
    await page.keyboard.press("ControlOrMeta+End")
    await page.keyboard.press(lineEnd)
    await page.keyboard.press("Enter")
    await page.keyboard.press("Enter")
    await page.keyboard.type("after")
    await expect(editor(page).locator("pre")).toHaveText("npm install acme@2.4")
    await expect(editor(page).locator("p").last()).toHaveText("after")
  })

  test("an agent's insert adds to the end and keeps mentions", async ({ page }) => {
    await clear(page)
    await page.keyboard.type("Thanks @gra")
    await page.getByRole("option", { name: "Grace Hopper" }).click()
    const result = await page.evaluate(() =>
      (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean }> } }).agent.act({ steps: [{ ref: "Release notes", action: "insert", args: ["Signed"] }] }),
    )
    expect(result.ok).toBe(true)
    await expect(editor(page).locator(".rich-text-mention")).toHaveCount(1)
    await expect(editor(page).locator("p").last()).toHaveText("Signed")
  })
})

test.describe("review fixes, part 2", () => {
  test("the editor's own clipboard type is checked like any paste", async ({ page, browserName }) => {
    test.skip(browserName === "firefox", "Firefox empties the data of a paste event made by a script")
    await clear(page)
    await editor(page).evaluate((el) => {
      const data = new DataTransfer()
      data.setData("application/x-uiset-rich-text", JSON.stringify([{ type: "heading", level: "1 onmouseover=x", content: [{ text: "bad", marks: { link: "javascript:alert(1)" } }] }]))
      data.setData("text/plain", "bad")
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }))
    })
    await expect(editor(page).getByRole("heading", { level: 1, name: "bad" })).toBeVisible()
    await expect(editor(page).locator("a")).toHaveCount(0)
  })

  test("undo puts the caret back where the change was", async ({ page }) => {
    await editor(page).getByText("Before we ship").click()
    await page.keyboard.press(lineEnd)
    await page.keyboard.type("X")
    await page.keyboard.press("ControlOrMeta+z")
    await page.keyboard.type("Y")
    await expect(editor(page).getByRole("heading", { level: 3 })).toHaveText("Before we shipY")
  })

  test("text from an input method takes the marks typing would, not the code it follows", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "drives the input method through Chrome's DevTools protocol")
    await clear(page)
    // Right after the closing backtick, the browser would write composed text into <code>.
    await page.keyboard.type("run `npm i`")
    await expect(editor(page).locator("code")).toHaveText("npm i")
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Input.imeSetComposition", { text: "して", selectionStart: 2, selectionEnd: 2 })
    await cdp.send("Input.insertText", { text: "して" })
    await expect(editor(page).locator("p")).toHaveText("run npm iして")
    await expect(editor(page).locator("code")).toHaveText("npm i")
  })
})
