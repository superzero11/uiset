import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// The content and form parts as web elements, on a page with no React: the table's layout,
// code blocks, inline edit, upload, the sortable lists and motion. The avatar group, count
// badge, a code block's lines and the agent parts are in tests/unit/web-content.bridge.test.ts.
type Agent = { act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }> }
const act = (page: Page, steps: unknown[]) => page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/content.html")
  // Plain DOM queries before an axe scan: in Playwright's Firefox, a role query followed by a
  // scan crashes the page. A region query here did (3 runs of 3; 0 of 3 without), and so does
  // a textbox query before axe's `label` rule reaches the schema form's inputs.
  await page.waitForFunction(() => !!document.querySelector("#invoices [role=region]"))
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Content page passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      // With the inline edit open and an error showing, and an upload in the list. Plain DOM
      // queries throughout, for the reason above.
      await page.locator("#project uiset-inline-edit-preview button").click()
      await page.locator("#project uiset-inline-edit-input input").fill("")
      await page.locator("#project uiset-inline-edit-input input").press("Enter")
      await page.locator("#files input[type=file]").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") })
      // A tag refused, with its reason showing, and another being edited.
      await page.locator("#emails input").fill("nope")
      await page.locator("#emails input").press("Enter")
      await page.locator("#topics ui-combobox-chip").first().dblclick()
      await page.waitForFunction(
        () =>
          !!document.querySelector("uiset-inline-edit-error") &&
          !!document.querySelector('#files .upload-row[data-status="done"]') &&
          !!document.querySelector("#emails ui-field-error")?.textContent &&
          !!document.querySelector("#topics ui-combobox-chip[data-editing]"),
        undefined,
        { timeout: 15_000 },
      )
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("the table: a named scroll area; stacked, each cell is labelled by its heading, and roles stay", { tag: "@engine" }, async ({ page }) => {
  const table = page.getByRole("region", { name: "Invoices" }).getByRole("table")
  await expect(table.getByRole("rowheader", { name: "INV-003" })).toBeVisible()
  await page.setViewportSize({ width: 375, height: 800 })
  // Stacked below 30rem: the cells are blocks, and the table is still a table to assistive tech.
  await expect(table).toHaveAttribute("role", "table")
  await expect(table.getByRole("columnheader", { name: "Customer" })).toHaveCount(1)
  await expect(page.locator("#invoices td").filter({ hasText: "Initech" })).toHaveAttribute("data-label", "Customer")
  // A cell's own label stays.
  await expect(page.locator("#invoices tfoot td")).toHaveAttribute("data-label", "Total")
  // Rows added later are labelled too, and a renamed heading relabels them.
  await page.evaluate(() => {
    const row = document.createElement("tr")
    row.innerHTML = "<th scope=row>INV-007</th><td>Wayne</td><td>Paid</td><td>$10.00</td>"
    document.querySelector("#invoices tbody")!.append(row)
    document.querySelector("#invoices thead th:nth-child(2)")!.textContent = "Client"
  })
  await expect(page.locator("#invoices td").filter({ hasText: "Wayne" })).toHaveAttribute("data-label", "Client")
  await expect(page.locator("#invoices td").filter({ hasText: "Initech" })).toHaveAttribute("data-label", "Client")
})

test("copy puts the code on the clipboard", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Clipboard permissions are Chromium-only in Playwright")
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await page.locator("#snippet").getByRole("button", { name: "Copy app.tsx" }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('import { UISet } from "@/components/ui/uiset"')
})

test("code tabs switch by keyboard; the package manager is one choice for every command, kept for the next visit", async ({ page }) => {
  const frameworks = page.locator("#frameworks")
  await frameworks.getByRole("tab", { name: "HTML" }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(frameworks.getByRole("tab", { name: "Vue" })).toHaveAttribute("aria-selected", "true")
  await expect(frameworks).toHaveAttribute("value", "vue")
  await expect(frameworks.getByRole("button", { name: "Copy the Vue code" })).toBeVisible()
  // A second package command joins the first.
  await page.evaluate(() => {
    const second = document.createElement("uiset-package-command")
    second.id = "second"
    second.setAttribute("run", "shadcn@latest add superzero11/uiset/table")
    document.querySelector("main")!.append(second)
  })
  await page.locator("#install").getByRole("tab", { name: "pnpm" }).click()
  await expect(page.locator("#install").getByRole("tabpanel")).toContainText("pnpm add @uiset/web @ui-sdk/web")
  await expect(page.locator("#second").getByRole("tabpanel")).toContainText("pnpm dlx shadcn@latest add superzero11/uiset/table")
  await page.reload()
  await expect(page.locator("#install").getByRole("tab", { name: "pnpm" })).toHaveAttribute("aria-selected", "true")
})

test("inline edit: press to edit, Enter saves, Escape cancels, a problem keeps the field, and focus comes back", async ({ page }) => {
  const project = page.locator("#project")
  const heard: string[] = []
  await page.exposeFunction("heard", (value: string) => heard.push(value))
  await project.evaluate((el) => el.addEventListener("valuechange", (e) => (window as unknown as { heard: (v: string) => void }).heard((e as CustomEvent<{ value: string }>).detail.value)))
  await page.getByRole("button", { name: "Edit Project name: Atlas" }).click()
  const field = page.getByRole("textbox", { name: "Project name" })
  await expect(field).toBeFocused()
  await field.fill(" ")
  await field.press("Enter")
  await expect(field).toHaveAttribute("aria-invalid", "true")
  const describedBy = await field.getAttribute("aria-describedby")
  await expect(page.locator(`[id="${describedBy}"]`)).toHaveText("Give the project a name.")
  await field.fill("Atlas Prime")
  await field.press("Enter")
  await expect(page.getByRole("button", { name: "Edit Project name: Atlas Prime" })).toBeFocused()
  expect(heard).toEqual(["Atlas Prime"])
  expect(await project.evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe("Atlas Prime")
  await page.keyboard.press("F2")
  await field.fill("Not this")
  await field.press("Escape")
  await expect(page.getByRole("button", { name: "Edit Project name: Atlas Prime" })).toBeFocused()
  // Save and Cancel are for pointers: Save saves what's typed.
  await page.getByRole("button", { name: "Edit Project name: Atlas Prime" }).click()
  await field.fill("Atlas Two")
  await page.getByRole("button", { name: "Save Project name" }).click()
  await expect(page.getByRole("button", { name: "Edit Project name: Atlas Two" })).toBeVisible()
})

test("inline edit: a refused change keeps the value; agents edit it by name", async ({ page }) => {
  const project = page.locator("#project")
  await project.evaluate((el) => el.addEventListener("valuechange", (e) => (e as CustomEvent<{ value: string }>).detail.value === "Nope" && e.preventDefault()))
  await page.getByRole("button", { name: /^Edit Project name/ }).click()
  const field = page.getByRole("textbox", { name: "Project name" })
  await field.fill("Nope")
  await field.press("Enter")
  // Refused, the text stays in the field to fix, and Escape leaves the value as it was.
  await expect(field).toHaveValue("Nope")
  await field.press("Escape")
  await expect(page.getByRole("button", { name: "Edit Project name: Atlas" })).toBeVisible()
  const set = await act(page, [{ ref: "Project name", action: "setValue", args: ["Atlas by agent"] }])
  expect(set.ok, set.error?.message).toBe(true)
  await expect(page.getByRole("button", { name: "Edit Project name: Atlas by agent" })).toBeVisible()
  // The agent's text goes through `validate` like a person's, and the agent hears it failed.
  const empty = await act(page, [{ ref: "Project name", action: "setValue", args: [""] }])
  expect(empty.ok).toBe(false)
  await expect(page.getByRole("button", { name: "Edit Project name: Atlas by agent" })).toBeVisible()
})

test("upload: files go up with progress; one that fails retries with Enter; a file it can't take is listed with why", async ({ page }) => {
  const list = page.getByRole("list", { name: "Attachments" })
  // Named with the upload's label, apart from any other upload on the page.
  await expect(page.getByRole("button", { name: "Choose files, Attachments", exact: true })).toBeVisible()
  await page.locator("#files input[type=file]").setInputFiles([
    { name: "photo.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) },
    { name: "fail-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") },
  ])
  const photo = list.getByRole("listitem").filter({ hasText: "photo.png" })
  const failing = list.getByRole("listitem").filter({ hasText: "fail-report.pdf" })
  await expect(photo.getByRole("progressbar", { name: "Uploading photo.png" })).toBeVisible()
  // While it goes up: Cancel, not Remove.
  await expect(photo.getByRole("button", { name: "Cancel photo.png" })).toBeAttached()
  await expect(photo.getByRole("button", { name: "Remove photo.png" })).toBeHidden()
  await expect(photo).toContainText("Uploaded", { timeout: 5000 })
  await expect(photo.getByRole("progressbar")).toHaveCount(0)
  await expect(failing).toContainText("Failed: The server said no.", { timeout: 5000 })
  await expect(failing.getByRole("button", { name: "Retry fail-report.pdf" })).toBeAttached()
  await expect(failing.getByRole("button", { name: "Remove fail-report.pdf" })).toBeAttached()
  await expect(failing.getByRole("button", { name: "Cancel fail-report.pdf" })).toHaveCount(0)
  // The row takes Enter to retry: it goes up again (and fails again).
  await failing.focus()
  await page.keyboard.press("Enter")
  await expect(failing.getByRole("progressbar")).toBeVisible()
  await expect(failing).toContainText("Failed", { timeout: 5000 })
  // Delete removes the focused file.
  await failing.focus()
  await page.keyboard.press("Delete")
  await expect(list.getByRole("listitem")).toHaveCount(1)
  // A type it doesn't take.
  await page.locator("#files input[type=file]").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") })
  await expect(page.locator("#files .upload-rejected")).toHaveText("notes.txt isn't a type this takes.")
  await expect(list.getByRole("listitem")).toHaveCount(1)
})

test("upload: v-model's events fire once per change, and `value` is the files", async ({ page }) => {
  await page.locator("#files").evaluate((el) => {
    const heard: string[] = []
    el.addEventListener("input", () => heard.push(`input:${(el as HTMLElement & { value: File[] }).value.map((f) => f.name).join(",")}`))
    el.addEventListener("valuechange", (e) => heard.push(`valuechange:${(e as CustomEvent<{ value: File[] }>).detail.value.length}`))
    ;(window as unknown as { heard: string[] }).heard = heard
  })
  await page.locator("#files input[type=file]").setInputFiles({ name: "a.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") })
  await expect.poll(() => page.evaluate(() => (window as unknown as { heard: string[] }).heard)).toEqual(["valuechange:1", "input:a.pdf"])
})

test("the sortable list moves by keys, reports the new order, and an agent moves an item by name", async ({ page }) => {
  const list = page.locator("#priorities")
  await list.getByRole("option", { name: "Faster search" }).focus()
  await page.evaluate(() => {
    const el = document.getElementById("priorities")!
    el.addEventListener("valuechange", (e) => ((window as unknown as { changes: unknown[] }).changes ??= []).push((e as CustomEvent).detail.value))
  })
  for (const key of ["Space", "ArrowDown", "Space"]) await page.keyboard.press(key)
  expect(await page.evaluate(() => (window as unknown as { changes: string[][] }).changes)).toEqual([["offline", "search", "export", "sso", "dark"]])
  await expect(page.locator("#priorities-first")).toHaveText("First: Offline mode")
  await expect(list.getByRole("option", { name: "Faster search" })).toBeFocused()
  const result = await act(page, [{ ref: "Rank what to build first", action: "moveItem", args: ["Dark mode", 1] }])
  expect(result.ok).toBe(true)
  expect(await list.evaluate((el) => (el as HTMLElement & { value: string[] }).value)).toEqual(["dark", "offline", "search", "export", "sso"])
  // Setting the order from script fires nothing; keys it leaves out follow, in the items' order.
  await list.evaluate((el) => ((el as HTMLElement & { value: string[] }).value = ["sso", "dark"]))
  expect(await list.evaluate((el) => (el as HTMLElement & { value: string[] }).value)).toEqual(["sso", "dark", "search", "offline", "export"])
  expect(await page.evaluate(() => (window as unknown as { changes: string[][] }).changes)).toHaveLength(2)
})

test("the playlist moves its selection together, past a locked track that can't be picked up", async ({ page }) => {
  const list = page.locator("#playlist")
  await list.getByRole("option", { name: "Salt and Cedar" }).focus()
  await page.keyboard.press("Shift+Space")
  await page.keyboard.press("Shift+ArrowDown")
  expect(await list.evaluate((el) => (el as HTMLElement & { selected: string[] }).selected)).toEqual(["salt", "late"])
  for (const key of ["Space", "Home", "Space"]) await page.keyboard.press(key)
  expect(await list.evaluate((el) => (el as HTMLElement & { value: string[] }).value)).toEqual(["salt", "late", "intro", "harbor", "paper", "north"])
  const intro = list.getByRole("option", { name: "Intro" })
  await expect(intro).toHaveAttribute("aria-disabled", "true")
  await intro.focus()
  await page.keyboard.press("Space")
  await expect(intro).not.toHaveAttribute("data-moving")
})

test("the sortable tree nests by keys, keeps its items live, and an agent moves a file into a folder", async ({ page }) => {
  const tree = page.locator("#files-tree")
  const levels = () => tree.getByRole("treeitem").evaluateAll((els) => els.map((el) => `${el.getAttribute("aria-level")} ${el.getAttribute("aria-label")}`))
  await tree.getByRole("treeitem", { name: "lib" }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(tree.getByRole("treeitem", { name: "utils.ts" })).toBeVisible()
  await page.keyboard.press("ArrowRight")
  await expect(tree.getByRole("treeitem", { name: "utils.ts" })).toBeFocused()
  // Out a level: beside lib, in src.
  for (const key of ["Space", "ArrowLeft", "Space"]) await page.keyboard.press(key)
  await expect(page.locator("#files-tree-moved")).toHaveText("Moved utils into src.")
  expect(await levels()).toContain("2 utils.ts")
  const items = await tree.evaluate((el) => (el as HTMLElement & { items: { value: string; children?: { value: string }[] }[] }).items)
  expect(items[0]!.children!.map((item) => item.value)).toEqual(["components", "lib", "utils", "app"])
  const result = await act(page, [{ ref: "Project files", action: "moveItem", args: ["package.json", "public"] }])
  expect(result.ok).toBe(true)
  expect(await levels()).toContain("2 package.json")
  const refused = await act(page, [{ ref: "Project files", action: "moveItem", args: ["app.tsx", "README.md"] }])
  expect(refused.error?.message).toContain("README.md can't hold other items.")
})

test("Motion: a sale moves the figure, an answer streams in, Thinking is a status, a plan swaps in place", { tag: "@engine" }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto("/content.html")
  const revenue = page.locator("#revenue")
  await revenue.scrollIntoViewIfNeeded()
  await page.getByRole("button", { name: "Add a sale" }).click()
  await expect(revenue.locator(".uiset-visually-hidden")).toHaveText("$14,130")
  await expect(revenue).toHaveAttribute("data-mode", "roll")
  await page.getByRole("button", { name: "Stream the answer" }).click()
  await expect(page.locator("#answer .text-reveal-piece[data-new]").first()).toBeAttached()
  await expect(page.locator("#answer")).toContainText("when the reader leaves.", { timeout: 10_000 })
  await expect(page.getByRole("status").filter({ hasText: "Searching the docs…" })).toBeVisible()
  await page.getByRole("button", { name: "Team", exact: true }).click()
  await expect(page.locator('#plan > [data-value="team"]')).toBeVisible()
  await expect(page.locator('#plan > [data-value="pro"]')).toBeHidden()
})
