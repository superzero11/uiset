import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"
import { openGallery } from "./gallery"

// The parts added after launch: table, avatar group, count badge, code block, inline edit and
// upload. What needs a real browser: layout, sticky cells, focus and keys.

const example = (page: Page, title: string) =>
  page.locator(`section.example:has(#example-${title.toLowerCase().replace(/\W+/g, "-")})`)

async function open(page: Page, query = "") {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGallery(page, `/gallery${query}`)
  await expect(page.locator(".components-surface")).toBeVisible({ timeout: 20_000 })
}

/* ------------------------------------------------------------------ scroll area */

// The fades' sizes, read from the mask: [above, below] in px.
const fades = (viewport: import("@playwright/test").Locator) =>
  viewport.evaluate((el) => {
    const mask = getComputedStyle(el).maskImage
    const block = mask.slice(0, mask.indexOf("linear-gradient", 10))
    const start = Number(/rgb\(0, 0, 0\) ([\d.]+)px/.exec(block)?.[1] ?? 0)
    const end = Number(/calc\(100% - ([\d.]+)px\)/.exec(block)?.[1] ?? 0)
    return [Math.round(start), Math.round(end)]
  })

test("a scroll area fades where its content runs on, and keyboard focus rings the whole box", async ({ page }) => {
  await open(page)
  const area = example(page, "Scroll area")
  await area.scrollIntoViewIfNeeded()
  const viewport = area.locator('[data-slot="scroll-area-viewport"]')
  const fade = await page.evaluate(() => Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5))
  // At the top, only the bottom fades; in the middle, both; at the end, only the top.
  await expect.poll(() => fades(viewport)).toEqual([0, fade])
  await viewport.evaluate((el) => (el.scrollTop = 40))
  await expect.poll(() => fades(viewport)).toEqual([fade, fade])
  await viewport.evaluate((el) => (el.scrollTop = el.scrollHeight))
  await expect.poll(() => fades(viewport)).toEqual([fade, 0])
  // The mask would fade a ring inside the viewport, so the frame wears it, unmasked.
  await viewport.focus()
  await page.keyboard.press("ArrowUp")
  const rings = await viewport.evaluate((el) => [getComputedStyle(el).outlineStyle, getComputedStyle(el.parentElement!).outlineStyle])
  expect(rings).toEqual(["none", "solid"])
})

test("data-fades=none turns the fades off", async ({ page }) => {
  await open(page)
  const area = example(page, "Scroll area")
  await area.scrollIntoViewIfNeeded()
  const viewport = area.locator('[data-slot="scroll-area-viewport"]')
  await viewport.evaluate((el) => {
    el.parentElement!.setAttribute("data-fades", "none")
    el.scrollTop = 40
  })
  await expect.poll(() => viewport.evaluate((el) => getComputedStyle(el).maskImage)).toBe("none")
})

/* ------------------------------------------------------------------ radio cards */

test("a radio card chooses its option wherever it's pressed, named by its title alone", async ({ page }) => {
  await open(page)
  const radio = example(page, "Radio")
  await radio.scrollIntoViewIfNeeded()
  const team = radio.getByRole("radio", { name: "Team", exact: true })
  const pro = radio.getByRole("radio", { name: "Pro", exact: true })
  await expect(team).toHaveAccessibleDescription("Per month, for whole companies.")
  // A press on the card's line or its price chooses it, not only on the dot. The label covers
  // the card, so the press lands on it: press where the text is, as a person would.
  const press = async (text: string) => {
    const box = (await radio.getByText(text, { exact: true }).boundingBox())!
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  }
  await press("Per month, for whole companies.")
  await expect(team).toBeChecked()
  await press("$20")
  await expect(pro).toBeChecked()
  // Arrow keys move between cards, and the card wears the ring, not the dot.
  await pro.focus()
  await page.keyboard.press("ArrowDown")
  await expect(team).toBeChecked()
  await expect(team).toBeFocused()
  const rings = await team.evaluate((el) => [getComputedStyle(el).outlineStyle, getComputedStyle(el.closest(".uiset-radio-card")!).outlineStyle])
  expect(rings).toEqual(["none", "solid"])
})

test("an agent chooses a radio card's option by the group's name", async ({ page }) => {
  await page.goto("/docs/components/radio")
  const radio = page.locator(".example[data-ready]")
  await expect(radio.getByRole("radio", { name: "Pro", exact: true })).toBeChecked()
  const done = await page.evaluate(() =>
    (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }> } }).agent.act({
      steps: [{ ref: "Plan", action: "setValue", args: ["hobby"] }],
    }),
  )
  expect(done.ok, done.error?.message).toBe(true)
  await expect(radio.getByRole("radio", { name: "Hobby", exact: true })).toBeChecked()
})

/* ------------------------------------------------------------------ rings */

test("a ring meter fills to its value, and its label names it", async ({ page }) => {
  await open(page)
  const meter = example(page, "Meter").getByRole("meter", { name: "Reading goal" })
  await meter.scrollIntoViewIfNeeded()
  await expect(meter).toHaveAttribute("aria-valuenow", "62")
  const ring = await meter.evaluate((el) => getComputedStyle(el, "::before").backgroundImage)
  expect(ring).toMatch(/^conic-gradient\(.* 62%, /)
})

test("a progress ring with no value turns a quarter, and holds it still for reduced motion", async ({ page }) => {
  await open(page)
  const preparing = example(page, "Progress").getByRole("progressbar", { name: "Preparing" })
  await preparing.scrollIntoViewIfNeeded()
  await expect(preparing).not.toHaveAttribute("aria-valuenow")
  const still = await preparing.evaluate((el) => [getComputedStyle(el, "::before").animationName, getComputedStyle(el, "::before").backgroundImage])
  expect(still[0]).toBe("none")
  expect(still[1]).toContain("25%")
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await expect.poll(() => preparing.evaluate((el) => getComputedStyle(el, "::before").animationName)).toBe("uiset-ring-turn")
})

/* ------------------------------------------------------------------ textarea count */

test("a textarea's count describes it, and near the limit says what's left, once", async ({ page }) => {
  await open(page)
  const area = example(page, "Textarea")
  await area.scrollIntoViewIfNeeded()
  const notes = area.getByRole("textbox", { name: "Release notes" })
  const count = area.locator(".uiset-textarea-count > span")
  await expect(notes).toHaveAccessibleDescription("39 / 160 characters")
  const spoken = () => page.evaluate(() => Array.from(document.querySelectorAll("[aria-live]"), (el) => el.textContent ?? "").join(" | "))
  await notes.fill("x".repeat(140))
  await expect(count).toHaveAttribute("data-near", "")
  await expect.poll(spoken).toContain("20 characters left")
  // More keys near the limit stay quiet; at the limit it says so, and the field stops there.
  await notes.press("End")
  await notes.pressSequentially("xxxx")
  await expect(count).toHaveText("144 / 160 characters")
  expect(await spoken()).not.toContain("16 characters left")
  await notes.pressSequentially("x".repeat(20))
  await expect(count).toHaveText("160 / 160 characters")
  await expect(count).toHaveAttribute("data-full", "")
  await expect.poll(spoken).toContain("No characters left")
})

/* ------------------------------------------------------------------ password rules */

test("password rules tick off as it's typed, and each change is said once", async ({ page }) => {
  await open(page)
  const area = example(page, "Password input")
  await area.scrollIntoViewIfNeeded()
  const password = area.locator("input").first()
  const rules = area.getByRole("list", { name: "Password rules" })
  const rule = (name: string) => rules.getByRole("listitem").filter({ hasText: name })
  const spoken = () => page.evaluate(() => Array.from(document.querySelectorAll("[aria-live]"), (el) => el.textContent ?? "").join(" | "))
  await expect(rule("A number")).toHaveText("To do: A number")
  await password.fill("hello1")
  await expect(rule("A number")).toHaveText("Done: A number")
  await expect(rule("A number")).toHaveAttribute("data-met", "")
  await expect.poll(spoken).toContain("Done: A number")
  await password.fill("Hello1world!")
  await expect.poll(spoken).toContain("Every rule is met")
  await password.fill("hello")
  await expect.poll(spoken).toContain("To do: A number")
  await expect(rule("At least 12 characters")).not.toHaveAttribute("data-met")
})

/* ------------------------------------------------------------------ confirm button */

test("a confirm button arms on the first press, says so, and acts on the second", async ({ page }) => {
  await open(page)
  const area = example(page, "Button")
  await area.scrollIntoViewIfNeeded()
  const spoken = () => page.evaluate(() => Array.from(document.querySelectorAll("[aria-live]"), (el) => el.textContent ?? "").join(" | "))
  await area.getByRole("button", { name: "Delete project" }).focus()
  await page.keyboard.press("Enter")
  const armed = area.getByRole("button", { name: "Press again to delete" })
  await expect(armed).toBeFocused()
  await expect.poll(spoken).toContain("Press again to delete")
  await page.waitForTimeout(700)
  await page.keyboard.press("Enter")
  await expect(area.getByRole("status")).toHaveText("Atlas deleted.")
})

test("an agent's press on a confirm button waits for the person, and nothing happens meanwhile", async ({ page }) => {
  await page.goto("/docs/components/button")
  const area = page.locator(".example[data-ready]")
  await expect(area.getByRole("button", { name: "Delete project" })).toBeVisible()
  const target = await page.evaluate(async () => (await (window as unknown as { agent: { query: (q: unknown) => Promise<{ confirm?: string }[]> } }).agent.query({ text: "Delete project" }))[0])
  expect(target?.confirm).toBe("Deletes the Atlas project and its deploys")
  await page.evaluate(() => {
    void (window as unknown as { agent: { act: (x: unknown) => Promise<unknown> } }).agent.act({ steps: [{ ref: "Delete project", action: "press" }] })
  })
  await page.waitForTimeout(800)
  await expect(area.getByRole("button", { name: "Delete project" })).not.toHaveAttribute("data-armed")
  await expect(area.getByRole("status")).toHaveText("")
})

/* ------------------------------------------------------------------ table */

test("the table's headings and first column stay put while it scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 })
  await open(page)
  const table = example(page, "Table")
  await table.scrollIntoViewIfNeeded()
  const viewport = table.locator('[data-slot="scroll-area-viewport"]')
  const box = async (text: string) => (await table.getByText(text, { exact: true }).first().boundingBox())!
  const frame = (await viewport.boundingBox())!
  expect(await viewport.evaluate((el) => el.scrollWidth > el.clientWidth && el.scrollHeight > el.clientHeight)).toBe(true)
  const head = await box("Customer")
  const first = await box("INV-1044")

  const moved = await viewport.evaluate((el) => {
    el.scrollTo(80, 60)
    return { x: el.scrollLeft, y: el.scrollTop }
  })
  expect(moved.x).toBeGreaterThan(20)
  expect(moved.y).toBeGreaterThan(20)
  await expect(table.locator(".table-frame")).not.toHaveAttribute("data-at-x-start", "")
  // The heading row is still at the top, and has moved sideways with its column.
  expect(Math.abs((await box("Customer")).y - head.y)).toBeLessThan(1)
  expect(Math.abs((await box("Customer")).x - (head.x - moved.x))).toBeLessThan(1)
  // The first column is still at the edge, and has moved up with its row.
  expect(Math.abs((await box("INV-1044")).x - first.x)).toBeLessThan(1)
  expect(Math.abs((await box("INV-1044")).y - (first.y - moved.y))).toBeLessThan(1)
  expect((await box("Invoice")).x).toBeGreaterThanOrEqual(frame.x)
  // Sticky cells paint over what passes under them.
  const paints = await table.locator("tbody tr:first-child > :first-child").evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(paints).not.toBe("rgba(0, 0, 0, 0)")
})

test("right to left, the first column keeps to the right edge", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 })
  await open(page)
  await page.evaluate(() => (document.documentElement.dir = "rtl"))
  const table = example(page, "Table")
  await table.scrollIntoViewIfNeeded()
  const viewport = table.locator('[data-slot="scroll-area-viewport"]')
  const right = async (text: string) => {
    const box = (await table.getByText(text, { exact: true }).first().boundingBox())!
    return box.x + box.width
  }
  const before = await right("INV-1042")
  const amount = await right("Amount")
  const moved = await viewport.evaluate((el) => {
    el.scrollTo(-80, 0)
    return -el.scrollLeft
  })
  expect(moved).toBeGreaterThan(20)
  expect(Math.abs((await right("INV-1042")) - before)).toBeLessThan(1)
  expect(Math.abs((await right("Amount")) - (amount + moved))).toBeLessThan(1)
})

test("the table's region is a tab stop only while it scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 })
  await open(page)
  const viewport = example(page, "Table").locator('[data-slot="scroll-area-viewport"]')
  await expect(viewport).toHaveAttribute("tabindex", "0")
  await expect(viewport).toHaveAttribute("role", "region")
  await expect(viewport).toHaveAttribute("aria-label", "Invoices")
  // Stacked, nothing scrolls inside it: the page does.
  await page.setViewportSize({ width: 390, height: 900 })
  await expect(viewport).not.toHaveAttribute("tabindex", "0")
})

test("on a narrow screen each row stacks, with its headings beside the values", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await open(page)
  const table = example(page, "Table")
  await table.scrollIntoViewIfNeeded()
  const cell = table.getByText("Northwind Traders")
  await expect(cell).toHaveAttribute("data-label", "Customer")
  expect(await cell.evaluate((el) => getComputedStyle(el).display)).toBe("block")
  expect(await cell.evaluate((el) => getComputedStyle(el, "::before").content)).toContain("Customer")
  // The headings are out of sight but still in the table.
  const head = table.locator("thead")
  expect((await head.boundingBox())!.width).toBeLessThanOrEqual(1)
  await expect(table.getByRole("columnheader", { name: "Customer" })).toHaveCount(1)
  await expect(table.getByRole("rowheader", { name: "INV-1042" })).toHaveCount(1)
  // One value under another: Customer sits below Invoice in the same row.
  const invoice = (await table.getByText("INV-1042", { exact: true }).boundingBox())!
  const customer = (await cell.boundingBox())!
  expect(customer.y).toBeGreaterThan(invoice.y + 10)
  // Nothing runs off the side, and the whole list shows without a scroll box.
  const viewport = table.locator('[data-slot="scroll-area-viewport"]')
  expect(await viewport.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true)
})

/* ------------------------------------------------------------------ avatar group, count badge */

test("the avatar group overlaps its avatars without covering their initials", async ({ page }) => {
  await open(page)
  const group = example(page, "Avatar group").getByRole("group", { name: "Reviewers" })
  await group.scrollIntoViewIfNeeded()
  const boxes = await group.locator('[data-slot="avatar"]').evaluateAll((els) =>
    els.map((el) => {
      const avatar = el.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(el.querySelector('[data-slot="avatar-fallback"]')!)
      const text = range.getBoundingClientRect()
      return { left: avatar.left, right: avatar.right, textRight: text.right }
    }),
  )
  expect(boxes).toHaveLength(4)
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i]!.left).toBeLessThan(boxes[i - 1]!.right)
    expect(boxes[i - 1]!.textRight).toBeLessThanOrEqual(boxes[i]!.left)
  }
  await expect(group.getByText("+2")).toBeVisible()
})

test("a count badge sits on its button's top corner", async ({ page }) => {
  await open(page)
  const badge = example(page, "Badge")
  await badge.scrollIntoViewIfNeeded()
  const button = (await badge.getByRole("button", { name: "Notifications, 3 unread" }).boundingBox())!
  const count = (await badge.locator(".count-badge-count").first().boundingBox())!
  const center = { x: count.x + count.width / 2, y: count.y + count.height / 2 }
  expect(Math.abs(center.x - (button.x + button.width))).toBeLessThan(8)
  expect(Math.abs(center.y - button.y)).toBeLessThan(8)
  await expect(badge.locator(".count-badge-count").nth(1)).toHaveText("99+")
})

/* ------------------------------------------------------------------ code block */

test("a marked line doesn't hide the line after it, and line numbers aren't part of the text", async ({ page }) => {
  await open(page)
  const block = example(page, "Code block").locator(".code-block").nth(1)
  await block.scrollIntoViewIfNeeded()
  const lines = block.locator(".code-line")
  await expect(lines).toHaveCount(5)
  const tops = await lines.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
  for (let i = 1; i < tops.length; i++) expect(tops[i]!).toBeGreaterThan(tops[i - 1]! + 10)
  const lefts = await lines.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left))
  // Every line starts at the same edge, the marked one included.
  const marked = await lines.evaluateAll((els) => els.findIndex((el) => el.hasAttribute("data-highlighted")))
  expect(marked).toBe(3)
  expect(await block.locator("code").evaluate((el) => el.textContent)).toContain('import { Button } from "@/components/ui/button"\n\nexport function Save')
  expect(await lines.first().evaluate((el) => getComputedStyle(el, "::before").content)).toContain("counter(code-line)")
  expect(lefts[4]!).toBe(lefts[0]!)
})

test("code that runs wide is reached by keyboard, and its colors load", async ({ page }) => {
  await open(page)
  const block = example(page, "Code block").locator(".code-block").nth(1)
  await block.scrollIntoViewIfNeeded()
  const viewport = block.locator('[data-slot="scroll-area-viewport"]')
  await expect(viewport).toHaveAttribute("tabindex", "0")
  await expect(viewport).toHaveAttribute("aria-label", "save.tsx code")
  // The command above it wraps, so it scrolls nowhere and isn't a stop.
  const command = example(page, "Code block").locator(".code-block").first().locator('[data-slot="scroll-area-viewport"]').first()
  await expect(command).not.toHaveAttribute("tabindex", "0")
  await expect(block.locator(".code-line span[style*='color']").first()).toBeVisible({ timeout: 15_000 })
})

test("the package manager tabs move with the arrow keys, change the command and are remembered", async ({ page }) => {
  await open(page)
  const block = example(page, "Code block").locator(".code-block").first()
  await block.scrollIntoViewIfNeeded()
  await expect(block.locator('[data-slot="tabs-panel"]:not([hidden])')).toContainText("npx shadcn@latest add")
  await block.getByRole("tab", { name: "npm", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(block.getByRole("tab", { name: "pnpm" })).toHaveAttribute("aria-selected", "true")
  await expect(block.locator('[data-slot="tabs-panel"]:not([hidden])')).toContainText("pnpm dlx shadcn@latest add")
  await page.reload()
  await expect(page.locator(".components-surface")).toBeVisible({ timeout: 20_000 })
  // Examples this far down draw as they come into view, or once the browser is idle.
  const reloaded = example(page, "Code block")
  await reloaded.scrollIntoViewIfNeeded()
  await expect(reloaded.getByRole("tab", { name: "pnpm" })).toHaveAttribute("aria-selected", "true", { timeout: 20_000 })
})

/* ------------------------------------------------------------------ inline edit */

test("inline edit by keyboard: Enter edits, Enter saves, focus stays on the value", async ({ page }) => {
  await open(page)
  const edit = example(page, "Inline edit")
  await edit.scrollIntoViewIfNeeded()
  const value = edit.getByRole("button", { name: "Edit Project name: Atlas" })
  const at = (await value.boundingBox())!
  const textAt = (await value.locator(".inline-edit-value").boundingBox())!.x
  await value.focus()
  await page.keyboard.press("Enter")
  const field = edit.getByRole("textbox", { name: "Project name" })
  await expect(field).toBeFocused()
  await expect(field).toHaveValue("Atlas")
  // The field opens where the value was: same corner, same height.
  const box = (await field.boundingBox())!
  expect(Math.abs(box.x - at.x)).toBeLessThan(1)
  expect(Math.abs(box.y - at.y)).toBeLessThan(1)
  expect(Math.abs(box.height - at.height)).toBeLessThan(1)
  // And the text starts where it did, so the words don't jump.
  const inset = await field.evaluate((el) => parseFloat(getComputedStyle(el).borderInlineStartWidth) + parseFloat(getComputedStyle(el).paddingInlineStart))
  expect(Math.abs(box.x + inset - textAt)).toBeLessThan(1)
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.type("Orion")
  await page.keyboard.press("Enter")
  await expect(edit.getByRole("button", { name: "Edit Project name: Orion" })).toBeFocused()
  await expect(edit.getByText("Saved as: Orion")).toBeVisible()

  await page.keyboard.press("F2")
  await expect(field).toBeFocused()
  await page.keyboard.type(" two")
  await page.keyboard.press("Escape")
  await expect(edit.getByRole("button", { name: "Edit Project name: Orion" })).toBeFocused()
  await expect(edit.getByText("Saved as: Orion")).toBeVisible()
})

test("inline edit: Tab saves and moves on, and an empty name is refused", async ({ page, browserName }) => {
  // Safari's Tab skips buttons unless the person turned that on; Option+Tab always stops at them.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab"
  await open(page)
  const edit = example(page, "Inline edit")
  await edit.scrollIntoViewIfNeeded()
  await edit.getByRole("button", { name: "Edit Project name: Atlas" }).click()
  const field = edit.getByRole("textbox", { name: "Project name" })
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.press("Backspace")
  await page.keyboard.press("Enter")
  await expect(field).toBeFocused()
  await expect(field).toHaveAttribute("aria-invalid", "true")
  await expect(edit.getByText("A project needs a name.")).toBeVisible()
  await page.keyboard.type("Vega")
  await expect(edit.getByText("A project needs a name.")).toHaveCount(0)
  await page.keyboard.press(tab)
  await expect(edit.getByText("Saved as: Vega")).toBeVisible()
  await expect(field).toHaveCount(0)
  // Focus went on to the next control, not back to this one and not to the page.
  await expect(edit.getByRole("button", { name: "Edit Description: Add a description" })).toBeFocused()
})

test("inline edit: Cancel throws the typing away and Save keeps it, by pointer", async ({ page }) => {
  await open(page)
  const edit = example(page, "Inline edit")
  await edit.scrollIntoViewIfNeeded()
  await edit.getByRole("button", { name: "Edit Description: Add a description" }).click()
  const field = edit.getByRole("textbox", { name: "Description" })
  await page.keyboard.type("Billing service")
  await edit.getByRole("button", { name: "Cancel" }).click()
  await expect(field).toHaveCount(0)
  await expect(edit.getByRole("button", { name: "Edit Description: Add a description" })).toBeVisible()

  await edit.getByRole("button", { name: "Edit Description: Add a description" }).click()
  await page.keyboard.type("Billing service")
  await edit.getByRole("button", { name: "Save Description" }).click()
  await expect(edit.getByRole("button", { name: "Edit Description: Billing service" })).toBeVisible()
})

test("inline edit: a value that can't be edited doesn't open", async ({ page }) => {
  await open(page)
  const edit = example(page, "Inline edit")
  const region = edit.getByRole("button", { name: "Edit Region: Europe (Frankfurt)" })
  await expect(region).toHaveAttribute("aria-disabled", "true")
  await region.click({ force: true })
  await region.focus()
  await page.keyboard.press("Enter")
  await expect(edit.getByRole("textbox")).toHaveCount(0)
})

/* ------------------------------------------------------------------ upload */

test("uploads go up, one fails and is retried from the keyboard, and Delete removes a file", async ({ page }) => {
  await open(page)
  const upload = example(page, "Upload")
  await upload.scrollIntoViewIfNeeded()
  const list = upload.getByRole("list", { name: "Attachments" })
  const row = (name: string) => list.getByRole("listitem").filter({ hasText: name })
  await expect(row("roadmap.pdf")).toContainText("Uploaded", { timeout: 10_000 })
  await expect(row("cover.svg").locator(".upload-preview img")).toBeVisible()
  await expect(row("export.csv")).toContainText("Failed: The connection dropped.")
  await expect(row("export.csv").getByRole("button", { name: "Retry export.csv" })).toBeVisible()

  // The list is one tab stop; arrows reach the failed row, and Enter sends it again.
  await row("roadmap.pdf").focus()
  await page.keyboard.press("End")
  await expect(row("export.csv")).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(row("export.csv")).toContainText("Uploading")
  await expect(row("export.csv").getByRole("progressbar", { name: "Uploading export.csv" })).toBeVisible()
  await expect(row("export.csv")).toContainText("Uploaded", { timeout: 10_000 })

  await page.keyboard.press("Delete")
  await expect(row("export.csv")).toHaveCount(0)
  await expect(list.getByRole("listitem")).toHaveCount(2)
})

test("chosen files join the queue, a file that's too large is refused with the reason, and Cancel stops one", async ({ page }) => {
  await open(page)
  const upload = example(page, "Upload")
  await upload.scrollIntoViewIfNeeded()
  const list = upload.getByRole("list", { name: "Attachments" })
  await upload.locator('input[type="file"]').setInputFiles([
    { name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(2048) },
    { name: "huge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(6_000_000) },
  ])
  const notes = list.getByRole("listitem").filter({ hasText: "notes.pdf" })
  await expect(notes).toContainText("Uploading")
  await expect(upload.getByText("huge.pdf is larger than 5 MB.")).toBeVisible()
  await expect(list.getByRole("listitem").filter({ hasText: "huge.pdf" })).toHaveCount(0)
  await notes.getByRole("button", { name: "Cancel notes.pdf" }).click()
  await expect(notes).toContainText("Canceled")
  await notes.getByRole("button", { name: "Retry notes.pdf" }).click()
  await expect(notes).toContainText("Uploaded", { timeout: 10_000 })
})

/* ------------------------------------------------------------------ sortable list */

const order = (list: import("@playwright/test").Locator) =>
  list.getByRole("option").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")))
const spoken = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll("[aria-live]"), (el) => el.textContent ?? "").join(" | "))

test("a sortable list moves an item with the keys, says each step, and its places follow", async ({ page }) => {
  await open(page)
  const area = example(page, "Sortable list")
  await area.scrollIntoViewIfNeeded()
  const list = area.getByRole("listbox", { name: "Priorities" })
  const item = list.getByRole("option", { name: "Faster search" })
  await item.focus()
  await page.keyboard.press("Space")
  await expect(item).toHaveAttribute("data-moving", "")
  await expect.poll(() => spoken(page)).toContain("Faster search")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Space")
  expect(await order(list)).toEqual(["Offline mode", "Export to PDF", "Faster search", "Single sign-on", "Dark mode"])
  await expect(item).toBeFocused()
  await expect(item).not.toHaveAttribute("data-moving")
  await expect(item.locator(".sortable-list-position")).toHaveText("3")
  await expect(area.getByText("First: Offline mode")).toBeVisible()
  // Escape puts a picked-up item back.
  await page.keyboard.press("Space")
  await page.keyboard.press("Home")
  await page.keyboard.press("Escape")
  expect((await order(list))[2]).toBe("Faster search")
})

test("a sortable list moves an item by drag, with a copy under the pointer", async ({ page }) => {
  await open(page)
  const area = example(page, "Sortable list")
  await area.scrollIntoViewIfNeeded()
  const list = area.getByRole("listbox", { name: "Priorities" })
  const from = (await list.getByRole("option", { name: "Dark mode" }).boundingBox())!
  const to = (await list.getByRole("option").first().boundingBox())!
  await page.mouse.move(from.x + 40, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 40, from.y - 8, { steps: 4 })
  await page.mouse.move(to.x + 40, to.y + 4, { steps: 12 })
  await expect(page.locator("[data-drag-preview]")).toBeVisible()
  await page.mouse.up()
  await expect(page.locator("[data-drag-preview]")).toHaveCount(0)
  expect((await order(list))[0]).toBe("Dark mode")
})

test("a selection moves together by drag, and its copy says how many it carries", async ({ page }) => {
  await open(page)
  const area = example(page, "Sortable list")
  await area.scrollIntoViewIfNeeded()
  const list = area.getByRole("listbox", { name: "Playlist" })
  await expect(list.locator('[aria-selected="true"]')).toHaveCount(2)
  const from = (await list.getByRole("option", { name: "Paper Planes" }).boundingBox())!
  const to = (await list.getByRole("option", { name: "Harbor Lights" }).boundingBox())!
  await page.mouse.move(from.x + 80, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 80, from.y - 8, { steps: 4 })
  await page.mouse.move(to.x + 80, to.y + 4, { steps: 12 })
  await expect(page.locator("[data-drag-preview]")).toHaveAttribute("data-drag-count", "2")
  await page.mouse.up()
  expect(await order(list)).toEqual(["Intro", "Paper Planes", "North Window", "Harbor Lights", "Salt and Cedar", "Late Train"])
  // The locked first track has no check and can't be picked up.
  const intro = list.getByRole("option", { name: "Intro" })
  await expect(intro).toHaveAttribute("aria-disabled", "true")
  await intro.focus()
  await page.keyboard.press("Space")
  await expect(intro).not.toHaveAttribute("data-moving")
})

test("Shift+Space and a press on a check select, and Escape lets go", async ({ page }) => {
  await open(page)
  const area = example(page, "Sortable list")
  await area.scrollIntoViewIfNeeded()
  const list = area.getByRole("listbox", { name: "Playlist" })
  await list.getByRole("option", { name: "Late Train" }).locator("[data-sortable-check]").click()
  await expect(list.getByRole("option", { name: "Late Train" })).toHaveAttribute("aria-selected", "true")
  await expect(list.getByRole("option", { name: "Late Train" })).toBeFocused()
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("Shift+Space")
  await expect(list.locator('[aria-selected="true"]')).toHaveCount(4)
  await page.keyboard.press("Escape")
  await expect(list.locator('[aria-selected="true"]')).toHaveCount(0)
})

/* ------------------------------------------------------------------ sortable tree */

/** The tree's rows that show, indented by level. */
const outline = (tree: import("@playwright/test").Locator) =>
  tree.getByRole("treeitem").evaluateAll((els) => els.map((el) => `${"  ".repeat(Number(el.getAttribute("aria-level")) - 1)}${el.getAttribute("aria-label")}`))

async function openTree(page: Page) {
  await open(page)
  const area = example(page, "Sortable tree")
  await area.scrollIntoViewIfNeeded()
  const tree = area.getByRole("tree", { name: "Project files" })
  await tree.evaluate((el) => el.scrollIntoView({ block: "center" }))
  return { area, tree }
}

test("a sortable tree nests a row with the keys, opens the branch it lands in, and says so", async ({ page }) => {
  const { area, tree } = await openTree(page)
  const json = tree.getByRole("treeitem", { name: "package.json" })
  await json.focus()
  await page.keyboard.press("Space")
  await expect(json).toHaveAttribute("data-moving", "")
  // Up past the empty public folder, then back down and a level in: inside it.
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowRight")
  await expect(json).toHaveAttribute("aria-level", "2")
  await page.keyboard.press("Space")
  await expect(tree.getByRole("treeitem", { name: "public" })).toHaveAttribute("aria-expanded", "true")
  await expect(json).toBeFocused()
  await expect(area.getByText("Moved package into public.")).toBeVisible()
  expect((await outline(tree)).slice(-3)).toEqual(["public", "  package.json", "README.md"])
})

test("a sortable tree moves a row by drag, a level in for each step sideways", async ({ page }) => {
  const { tree } = await openTree(page)
  const from = (await tree.getByRole("treeitem", { name: "package.json" }).boundingBox())!
  await page.mouse.move(from.x + 140, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 140, from.y + from.height / 2 - 6, { steps: 3 })
  // A level in: under the empty public folder above it.
  await page.mouse.move(from.x + 164, from.y + from.height / 2 - 4, { steps: 8 })
  await expect(page.locator("[data-drag-preview]")).toBeVisible()
  await expect(tree.getByRole("treeitem", { name: "package.json" })).toHaveAttribute("aria-level", "2")
  await page.mouse.up()
  expect((await outline(tree)).slice(-3)).toEqual(["public", "  package.json", "README.md"])
})

test("a row carried inside a file is marked, goes back when dropped, and says why", async ({ page }) => {
  const { tree } = await openTree(page)
  const button = tree.getByRole("treeitem", { name: "button.tsx" })
  await button.focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowRight")
  await expect(button).toHaveAttribute("data-invalid", "")
  await expect.poll(() => spoken(page)).toContain("dialog.tsx can't hold other items")
  await page.keyboard.press("Space")
  await expect.poll(() => spoken(page)).toContain("button.tsx can't go inside dialog.tsx")
  expect((await outline(tree)).slice(0, 4)).toEqual(["src", "  components", "    button.tsx", "    dialog.tsx"])
  await expect(button).not.toHaveAttribute("data-invalid")
})

/* ------------------------------------------------------------------ narrow screens */

const narrow = ["Table", "Avatar group", "Badge", "Code block", "Inline edit", "Upload", "Sortable list", "Sortable tree"]

test("the new parts fit a phone's width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await open(page)
  for (const title of narrow) {
    const section = example(page, title)
    await section.scrollIntoViewIfNeeded()
    const box = (await section.boundingBox())!
    expect(box.x + box.width, title).toBeLessThanOrEqual(375)
  }
  // Nothing pushes the page sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

// One scan per page load: several scans of this long, narrow page have crashed Firefox's page.
for (const theme of ["light", "dark"] as const) {
  for (const title of narrow) {
    test(`${title} passes axe at phone width, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await openGallery(page, `/gallery?theme=${theme}`)
      await expect(page.locator(".components-surface")).toBeVisible({ timeout: 20_000 })
      const section = example(page, title)
      await section.scrollIntoViewIfNeeded()
      // The upload example ends with two files up and one failed: scan that, not a moment on
      // the way. Waited for with a plain DOM query: in Playwright's Firefox, a text assertion
      // on this section followed by a scan of it crashes the page (4 runs of 4; 0 of 12 without).
      if (title === "Upload")
        await page.waitForFunction(
          () => document.querySelectorAll('section.example:has(#example-upload) .upload-row:is([data-status="done"], [data-status="failed"])').length === 3,
          undefined,
          { timeout: 15_000 },
        )
      const results = await new AxeBuilder({ page })
        .include(`section.example:has(#example-${title.toLowerCase().replace(/\W+/g, "-")})`)
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([])
    })
  }
}
