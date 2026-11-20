import AxeBuilder from "../axe"
import { expect, test, type Page } from "@playwright/test"

// <uiset-schema-form> on the Content page, with no React: a person through its steps, the
// server's answer, an agent filling it while the person approves the send, its value for
// v-model, every kind of control, and axe in every skin and theme.

type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; confirm?: string }[]>
}
type FormElement = HTMLElement & { value: Record<string, unknown>; form?: unknown; send?: unknown; api: { reset(): void } }
const form = (page: Page) => page.getByRole("form", { name: "Invite a teammate" })
const actions = (page: Page) => form(page).locator(".schema-form-actions")
const next = (page: Page) => actions(page).getByRole("button", { name: "Next" }).click()

// Nothing a test does may throw on the page, as a draw inside a draw once did.
let errors: string[] = []
test.afterEach(() => expect(errors).toEqual([]))

test.beforeEach(async ({ page }) => {
  errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/content.html")
  // A plain DOM query, as on the rest of this page (Firefox crashes on a role query then axe).
  await page.waitForFunction(() => !!document.querySelector("#invite [data-schema-field=email] input"))
  await page.locator("#invite").scrollIntoViewIfNeeded()
})

test("steps: Next checks the step and focuses its problem; the last Next shows the review and sends nothing", async ({ page }) => {
  await next(page)
  const email = form(page).getByRole("textbox", { name: "Email" })
  await expect(email).toHaveAttribute("aria-invalid", "true")
  await expect(email).toBeFocused()
  await expect(form(page)).toContainText("Email is required.")
  await email.fill("grace@example.com")
  // Fixing it clears the problem as it's typed.
  await expect(email).not.toHaveAttribute("aria-invalid", "true")
  for (let step = 0; step < 3; step++) await next(page)
  await expect(form(page).getByRole("region", { name: "Who" })).toContainText("grace@example.com")
  await expect(form(page)).toHaveAttribute("data-status", "idle")
  await actions(page).getByRole("button", { name: "Send invite" }).click()
  await expect(form(page)).toContainText("Invite sent.")
  await expect(form(page)).toHaveAttribute("data-status", "done")
  await expect(page.locator("#invite-sent")).toHaveText("Sent to grace@example.com as editor.")
})

// By keyboard: Safari doesn't focus a button a mouse presses, so there focus is never in the
// form to keep.
test("Enter in a field goes on to the next step; focus follows each step, and Back and Edit keep the values", async ({ page }) => {
  const email = form(page).getByRole("textbox", { name: "Email" })
  const press = (name: string) => form(page).getByRole("button", { name, exact: true }).press("Enter")
  await email.fill("grace@example.com")
  await form(page).getByRole("textbox", { name: "Full name" }).fill("Grace")
  await form(page).getByRole("textbox", { name: "Full name" }).press("Enter")
  // The field that had focus went with its step: focus is on the next step's first field.
  await expect(form(page).getByRole("radio", { name: "Editor" })).toBeFocused()
  // Back on the first step goes, so focus goes to the first field.
  await press("Back")
  await expect(email).toHaveValue("grace@example.com")
  await expect(email).toBeFocused()
  // Next stays Next until the review: focus stays on it.
  await press("Next")
  await expect(actions(page).getByRole("button", { name: "Next" })).toBeFocused()
  await press("Next")
  await press("Next")
  // Next became the send: focus is on it, with the review above.
  await expect(actions(page).getByRole("button", { name: "Send invite" })).toBeFocused()
  await press("Edit Who")
  await expect(email).toHaveValue("grace@example.com")
  await expect(email).toBeFocused()
  await expect(form(page).getByRole("navigation", { name: "Steps" }).locator("[aria-current=step]")).toContainText("Who")
})

// Its HTML from a server, before the element is defined: a native submit must not load the
// page with what was typed in its URL.
test("before the element is defined, Enter or Next loads nothing and keeps what was typed", async ({ page, browser }) => {
  const html = await page.locator("#invite").evaluate((el) => el.outerHTML)
  const context = await browser.newContext({ javaScriptEnabled: false })
  const plain = await context.newPage()
  await plain.setContent(`<!doctype html><body>${html}</body>`)
  const start = plain.url()
  await plain.locator("[data-schema-field=email] input").fill("grace@example.com")
  await plain.locator("[data-schema-field=name] input").press("Enter")
  await plain.locator(".schema-form-actions button").click()
  await plain.waitForTimeout(300)
  expect(plain.url()).toBe(start)
  await expect(plain.locator("[data-schema-field=email] input")).toHaveValue("grace@example.com")
  await context.close()
})

test("a problem the server sends back shows on its step, with focus on the field", async ({ page }) => {
  await form(page).getByRole("textbox", { name: "Email" }).fill("ada@example.com")
  for (let step = 0; step < 3; step++) await next(page)
  await actions(page).getByRole("button", { name: "Send invite" }).click()
  const email = form(page).getByRole("textbox", { name: "Email" })
  await expect(email).toBeFocused()
  await expect(form(page)).toContainText("Ada is already in this workspace.")
  await expect(form(page).getByRole("navigation", { name: "Steps" }).locator("[aria-current=step]")).toContainText("Who")
})

test("each control sets its field: a radio, the number's buttons, a date, a text area and a switch", async ({ page }) => {
  await form(page).getByRole("textbox", { name: "Email" }).fill("grace@example.com")
  await next(page)
  await form(page).getByRole("radio", { name: "Admin" }).click()
  await form(page).getByRole("button", { name: "Increase" }).click()
  await form(page).getByRole("button", { name: "Increase" }).click()
  await expect(form(page).getByRole("textbox", { name: "Seats" })).toHaveValue("3")
  await page.evaluate(() => ((document.getElementById("invite") as FormElement).value = { ...(document.getElementById("invite") as FormElement).value, start: "2026-12-01" }))
  await next(page)
  await form(page).getByRole("textbox", { name: "Message" }).fill("Welcome aboard.")
  await form(page).getByRole("switch", { name: "Email me when they join" }).click()
  await next(page)
  const access = form(page).getByRole("region", { name: "Access" })
  await expect(access).toContainText("Admin")
  await expect(access).toContainText("3")
  await expect(access).toContainText("Dec 1, 2026")
  const message = form(page).getByRole("region", { name: "Message" })
  await expect(message).toContainText("Welcome aboard.")
  await expect(message).toContainText("No")
  expect(await page.evaluate(() => (document.getElementById("invite") as FormElement).value)).toEqual({
    email: "grace@example.com",
    name: "",
    role: "admin",
    seats: 3,
    start: "2026-12-01",
    message: "Welcome aboard.",
    notify: false,
  })
})

test("an agent fills it by label; its press on Send waits for the person, who sends it", async ({ page }) => {
  const filled = await page.evaluate(() =>
    (window as unknown as { agent: Agent }).agent.act({
      steps: [
        { ref: "Invite a teammate", action: "fill", args: [{ Email: "grace@example.com", Role: "Admin", seats: "3", "Email me when they join": "no" }] },
        { ref: "Invite a teammate", action: "goTo", args: [3] },
      ],
    }),
  )
  expect(filled.ok, filled.error?.message).toBe(true)
  const access = form(page).getByRole("region", { name: "Access" })
  await expect(access).toContainText("Admin")
  await expect(access).toContainText("3")
  const send = await page.evaluate(async () => (await (window as unknown as { agent: Agent }).agent.query({ text: "Send invite" }))[0])
  expect(send?.confirm).toBe("Sends an invite email to the address given")
  const pressed = await page.evaluate(() => (window as unknown as { agent: Agent }).agent.act({ steps: [{ ref: "Send invite", action: "press" }] }))
  expect(pressed.ok).toBe(false)
  expect(pressed.error?.message).toContain("Needs a person")
  await expect(form(page)).toHaveAttribute("data-status", "idle")
  await actions(page).getByRole("button", { name: "Send invite" }).click()
  await expect(form(page)).toContainText("Invite sent.")
})

test("an agent's fill with problems shows them under the fields, and tells the agent", async ({ page }) => {
  const result = await page.evaluate(() =>
    (window as unknown as { agent: Agent }).agent.act({ steps: [{ ref: "Invite a teammate", action: "fill", args: [{ email: "grace@", seats: 99 }] }] }),
  )
  expect(result.ok).toBe(false)
  expect(result.error?.message).toContain("Email: Enter an email address, like name@example.com.")
  expect(result.error?.message).toContain("Seats is at most 50.")
  await expect(form(page).getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true")
})

test("formTool: the same definition as a tool fills the element through the bridge", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { formTool } = await import("/src/uiset.ts" as string)
    const el = document.getElementById("invite") as FormElement
    const tool = formTool(el.form, (window as unknown as { agent: Agent }).agent)
    return { name: tool.name, required: tool.inputSchema.required, result: await tool.execute({ email: "grace@example.com", role: "viewer" }) }
  })
  expect(result).toEqual({ name: "invite_teammate", required: ["email", "role"], result: { ok: true, filled: ["email", "role"] } })
  await expect(form(page).getByRole("textbox", { name: "Email" })).toHaveValue("grace@example.com")
})

// Vue's v-model on a custom element sets `value` and reads it back on `input`.
test("v-model: `value` is live, setting it fills the fields, and `input` fires once per change that's in", async ({ page }) => {
  await page.evaluate(() => {
    const el = document.getElementById("invite") as FormElement
    const heard: unknown[] = []
    const changes: string[] = []
    el.addEventListener("input", () => heard.push(el.value.email))
    el.addEventListener("valuechange", (event) => changes.push((event as CustomEvent<{ reason: string }>).detail.reason))
    Object.assign(window, { heard, changes })
    // What v-model writes on mount: the values it holds.
    el.value = { ...el.value }
  })
  const heard = () => page.evaluate(() => (window as unknown as { heard: unknown[] }).heard)
  const changes = () => page.evaluate(() => (window as unknown as { changes: string[] }).changes)
  const email = form(page).getByRole("textbox", { name: "Email" })
  await email.pressSequentially("ab")
  await expect.poll(heard).toEqual(["a", "ab"])
  expect(await changes()).toEqual(["input", "input"])
  // Written in from code, as a text field's value is: the field shows it, and nothing fires.
  await page.evaluate(() => ((document.getElementById("invite") as FormElement).value = { email: "ada@example.com" }))
  await expect(email).toHaveValue("ada@example.com")
  // Fields left out went to their defaults.
  expect(await page.evaluate(() => (document.getElementById("invite") as FormElement).value.role)).toBe("editor")
  // An agent's fill is a change like a person's.
  await page.evaluate(() => (window as unknown as { agent: Agent }).agent.act({ steps: [{ ref: "Invite a teammate", action: "fill", args: [{ email: "grace@example.com" }] }] }))
  await expect.poll(heard).toEqual(["a", "ab", "grace@example.com"])
  expect(await changes()).toEqual(["input", "input", "fill"])
  // A refused change fires nothing, and the field goes back to the value.
  await page.evaluate(() => document.getElementById("invite")!.addEventListener("valuechange", (event) => event.preventDefault()))
  await email.press("x")
  await page.waitForTimeout(100)
  expect(await heard()).toEqual(["a", "ab", "grace@example.com"])
  expect(await page.evaluate(() => (document.getElementById("invite") as FormElement).value.email)).toBe("grace@example.com")
})

test("a select and a checkbox, in a form made from script", async ({ page }) => {
  await page.evaluate(async () => {
    const { defineForm } = await import("/src/uiset.ts" as string)
    const el = document.createElement("uiset-schema-form") as FormElement
    el.id = "contact"
    el.setAttribute("heading", "3")
    el.form = defineForm({
      name: "contact_sales",
      title: "Contact sales",
      fields: {
        plan: {
          kind: "choice",
          label: "Plan",
          required: true,
          options: [
            { value: "team", label: "Team" },
            { value: "enterprise", label: "Enterprise" },
          ],
        },
        terms: { kind: "boolean", label: "I agree to be contacted", required: true },
      },
    })
    const sent: unknown[] = []
    el.send = (values: unknown) => void sent.push(values)
    Object.assign(window, { sent })
    document.querySelector("main")!.append(el)
  })
  const contact = page.getByRole("form", { name: "Contact sales" })
  await contact.getByRole("button", { name: "Submit" }).click()
  await expect(contact.getByRole("combobox", { name: "Plan" })).toBeFocused()
  await expect(contact).toContainText("Plan is required.")
  await expect(contact).toContainText("I agree to be contacted is required.")
  await contact.getByRole("combobox", { name: "Plan" }).click()
  await page.getByRole("option", { name: "Enterprise" }).click()
  await contact.getByRole("checkbox", { name: "I agree to be contacted" }).click()
  await contact.getByRole("button", { name: "Submit" }).click()
  await expect(contact).toHaveAttribute("data-status", "done")
  expect(await page.evaluate(() => (window as unknown as { sent: unknown[] }).sent)).toEqual([{ plan: "enterprise", terms: true }])
})

test("`disabled` turns every control off and the send can't send; `heading=\"false\"` with `label` names the form", async ({ page }) => {
  await page.evaluate(() => {
    const el = document.getElementById("invite")!
    el.setAttribute("heading", "false")
    el.setAttribute("label", "Invite")
    el.setAttribute("disabled", "")
  })
  const named = page.getByRole("form", { name: "Invite", exact: true })
  await expect(named).toHaveAttribute("data-disabled", "")
  await expect(named.getByRole("heading", { name: "Invite a teammate" })).toHaveCount(0)
  await expect(named.getByRole("textbox", { name: "Email" })).toBeDisabled()
  await page.evaluate(() => document.getElementById("invite")!.removeAttribute("disabled"))
  await expect(named.getByRole("textbox", { name: "Email" })).toBeEnabled()
})

test("taken off the page and put back, as a framework may, it keeps its values and still works", async ({ page }) => {
  await form(page).getByRole("textbox", { name: "Email" }).fill("grace@example.com")
  // Long enough out that it's given a new instance on its return.
  await page.evaluate(async () => {
    const el = document.getElementById("invite")!
    el.remove()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    document.querySelector("main")!.prepend(el)
  })
  const email = form(page).getByRole("textbox", { name: "Email" })
  await expect(email).toHaveValue("grace@example.com")
  await email.fill("ada@example.com")
  await expect.poll(() => page.evaluate(() => (document.getElementById("invite") as FormElement).value.email)).toBe("ada@example.com")
  await next(page)
  await expect(form(page).getByRole("radio", { name: "Editor" })).toBeVisible()
})

test("the form fits a phone's width, and its review stacks", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await form(page).getByRole("textbox", { name: "Email" }).fill("grace@example.com")
  for (let step = 0; step < 3; step++) await next(page)
  const box = (await form(page).boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(375)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  const row = form(page).getByRole("region", { name: "Who" })
  const [term, value] = [(await row.locator("dt").first().boundingBox())!, (await row.locator("dd").first().boundingBox())!]
  expect(value.y).toBeGreaterThan(term.y)
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    // Plain DOM queries only: in Playwright's Firefox a role query before an axe scan crashes the page.
    test(`passes axe in ${skin}, ${theme}, with a problem showing and on the review`, async ({ page }) => {
      const next = () => page.locator("#invite .schema-form-actions button[type=submit]").click()
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await next()
      await page.waitForFunction(() => document.querySelector("#invite [data-schema-field=email] input")?.getAttribute("aria-invalid") === "true")
      const scan = async () =>
        (await new AxeBuilder({ page }).include("#invite").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`,
        )
      expect(await scan()).toEqual([])
      await page.locator("#invite [data-schema-field=email] input").fill("grace@example.com")
      await next()
      await page.waitForFunction(() => !!document.querySelector("#invite ui-radio-group"))
      expect(await scan()).toEqual([])
      await next()
      await next()
      await page.waitForFunction(() => !!document.querySelector("#invite .schema-form-review"))
      expect(await scan()).toEqual([])
    })
  }
}
