import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// The content and form parts as web elements, on a page with no React: the table, avatar
// group, count badge, code blocks, inline edit and upload.
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
    test(`the Content page passes axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      // With the inline edit open and an error showing, and an upload in the list. Plain DOM
      // queries throughout, for the reason above.
      await page.locator("#project uiset-inline-edit-preview button").click()
      await page.locator("#project uiset-inline-edit-input input").fill("")
      await page.locator("#project uiset-inline-edit-input input").press("Enter")
      await page.locator("#files input[type=file]").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") })
      await page.waitForFunction(
        () => !!document.querySelector("uiset-inline-edit-error") && !!document.querySelector('#files .upload-row[data-status="done"]'),
        undefined,
        { timeout: 15_000 },
      )
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("the table: a named scroll area; stacked, each cell is labelled by its heading, and roles stay", async ({ page }) => {
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

test("the table takes a framework's insert and remove, though the table now sits in its scroll area", async ({ page }) => {
  const result = await page.evaluate(() => {
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
    return steps
  })
  expect(result).toEqual(["removed:true", "inserted:true"])
  await expect(page.getByRole("region", { name: "Invoices" }).getByRole("table")).toBeVisible()
})

test("the avatar group shows max avatars and names the rest in words; new avatars join the count", async ({ page }) => {
  const group = page.getByRole("group", { name: "Reviewers" })
  await expect(group.locator("ui-avatar:visible")).toHaveCount(4)
  await expect(group.getByRole("img", { name: "2 more" })).toHaveText("+2")
  await page.evaluate(() => {
    const avatar = document.createElement("ui-avatar")
    avatar.innerHTML = "<ui-avatar-fallback>DK</ui-avatar-fallback>"
    document.getElementById("reviewers")!.append(avatar)
  })
  await expect(group.getByRole("img", { name: "3 more" })).toHaveText("+3")
  // The count stays last, after the avatar that just arrived.
  expect(await group.evaluate((el) => el.lastElementChild!.classList.contains("avatar-group-more"))).toBe(true)
  await group.evaluate((el) => el.setAttribute("max", "10"))
  await expect(group.getByRole("img", { name: /more/ })).toHaveCount(0)
  await expect(group.locator("ui-avatar:visible")).toHaveCount(6)
})

test("the count badge shows the count, 99+ past max, a dot, nothing at 0, and says what's counted", async ({ page }) => {
  const inbox = page.locator("#inbox")
  await expect(inbox.locator(".count-badge-count")).toHaveText("3")
  await expect(inbox).toContainText("3 unread")
  await expect(page.locator("uiset-count-badge").nth(1).locator(".count-badge-count")).toHaveText("99+")
  await expect(page.locator("uiset-count-badge").nth(2).locator(".count-badge-count")).toHaveAttribute("data-dot", "")
  await inbox.evaluate((el) => ((el as HTMLElement & { count: number }).count = 0))
  await expect(inbox.locator(".count-badge-count")).toHaveCount(0)
  await expect(inbox).not.toContainText("3 unread")
  await inbox.evaluate((el) => el.setAttribute("show-zero", ""))
  await expect(inbox.locator(".count-badge-count")).toHaveText("0")
})

test("a code block: its lines, a marked line, the caption and a copy button named for it", async ({ page }) => {
  const block = page.locator("#snippet")
  await expect(block.locator(".code-block-title")).toHaveText("app.tsx")
  await expect(block.getByRole("group", { name: "app.tsx code" })).toBeVisible()
  await expect(block.locator(".code-line")).toHaveCount(5)
  await expect(block.locator(".code-line").nth(2)).toHaveAttribute("data-highlighted", "")
  await expect(block.getByRole("button", { name: "Copy app.tsx" })).toBeVisible()
  await block.evaluate((el) => ((el as HTMLElement & { code: string }).code = "one\ntwo\n"))
  await expect(block.locator(".code-line")).toHaveCount(2)
  await block.evaluate((el) => el.setAttribute("copy", "false"))
  await expect(block.getByRole("button", { name: /Copy/ })).toHaveCount(0)
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

test("upload: `upload` and `value` set before the element upgrades are kept", async ({ page }) => {
  const result = await page.evaluate(async () => {
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
    await new Promise((resolve) => setTimeout(resolve, 300))
    return { sent, files: el.value.map((file) => file.name) }
  })
  expect(result).toEqual({ sent: "early.pdf", files: ["early.pdf"] })
})
