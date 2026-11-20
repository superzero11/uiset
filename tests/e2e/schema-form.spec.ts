import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"
import { openGallery } from "./gallery"

// The schema form on the gallery: a person through its steps, the server's answer, an agent
// filling it with the person approving the send, and axe in every skin and theme.

type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; confirm?: string }[]>
}
const form = (page: Page) => page.getByRole("form", { name: "Invite a teammate" })
const actions = (page: Page) => form(page).locator(".schema-form-actions")

async function open(page: Page, query = "") {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openGallery(page, `/gallery${query}`)
  await expect(page.locator(".components-surface")).toBeVisible({ timeout: 20_000 })
  await form(page).scrollIntoViewIfNeeded()
}

test("steps: Next checks the step and focuses its problem; the last Next shows the review and sends nothing", async ({ page }) => {
  await open(page)
  await actions(page).getByRole("button", { name: "Next" }).click()
  const email = form(page).getByRole("textbox", { name: "Email" })
  await expect(email).toHaveAttribute("aria-invalid", "true")
  await expect(email).toBeFocused()
  await expect(form(page)).toContainText("Email is required.")
  await email.fill("grace@example.com")
  for (let step = 0; step < 3; step++) await actions(page).getByRole("button", { name: "Next" }).click()
  // The review, and nothing sent: the Next that led here didn't become the submit mid-click.
  await expect(form(page).getByRole("region", { name: "Who" })).toContainText("grace@example.com")
  await expect(form(page)).toHaveAttribute("data-status", "idle")
  await expect(actions(page).getByRole("button", { name: "Send invite" })).toBeVisible()
  await actions(page).getByRole("button", { name: "Send invite" }).click()
  await expect(form(page)).toContainText("Invite sent.")
  await expect(form(page)).toHaveAttribute("data-status", "done")
})

// By keyboard: Safari doesn't focus a button a mouse presses, so there focus is never in the
// form to keep.
test("Enter in any field of a step goes on, and focus follows each step", async ({ page }) => {
  await open(page)
  const email = form(page).getByRole("textbox", { name: "Email" })
  const press = (name: string) => form(page).getByRole("button", { name, exact: true }).press("Enter")
  await email.fill("grace@example.com")
  await form(page).getByRole("textbox", { name: "Full name" }).fill("Grace")
  await form(page).getByRole("textbox", { name: "Full name" }).press("Enter")
  // The field that had focus went with its step: focus is on the next step's first field.
  await expect(form(page).getByRole("radio", { name: "Editor" })).toBeFocused()
  // Back on the first step goes, so focus goes to the first field.
  await press("Back")
  await expect(email).toBeFocused()
  await press("Next")
  await expect(actions(page).getByRole("button", { name: "Next" })).toBeFocused()
  await press("Next")
  await press("Next")
  // Next became the send: focus is on it, with the review above, and nothing was sent.
  await expect(actions(page).getByRole("button", { name: "Send invite" })).toBeFocused()
  await expect(form(page)).toHaveAttribute("data-status", "idle")
  await press("Edit Who")
  await expect(email).toBeFocused()
})

// The server's HTML, before React hydrates it: a native submit must not load the page with
// what was typed in its URL.
test("before hydration, Enter or Next loads nothing and keeps what was typed", async ({ page, browser }) => {
  await open(page)
  const html = await form(page).evaluate((f) => f.outerHTML)
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
  await open(page)
  await form(page).getByRole("textbox", { name: "Email" }).fill("ada@example.com")
  for (let step = 0; step < 3; step++) await actions(page).getByRole("button", { name: "Next" }).click()
  await actions(page).getByRole("button", { name: "Send invite" }).click()
  const email = form(page).getByRole("textbox", { name: "Email" })
  await expect(email).toBeFocused()
  await expect(form(page)).toContainText("Ada is already in this workspace.")
  await expect(form(page).getByRole("navigation", { name: "Steps" }).locator("[aria-current=step]")).toContainText("Who")
})

test("an agent fills it by label; its press on Send waits for the person, who sends it", async ({ page }) => {
  await open(page)
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
  // The agent's press waits for the person's answer: nothing is sent meanwhile.
  await page.evaluate(() => {
    void (window as unknown as { agent: Agent }).agent.act({ steps: [{ ref: "Send invite", action: "press" }] })
  })
  await page.waitForTimeout(800)
  await expect(form(page)).toHaveAttribute("data-status", "idle")
  await actions(page).getByRole("button", { name: "Send invite" }).click()
  await expect(form(page)).toContainText("Invite sent.")
})

test("an agent's fill with problems shows them under the fields, and tells the agent", async ({ page }) => {
  await open(page)
  const result = await page.evaluate(() =>
    (window as unknown as { agent: Agent }).agent.act({ steps: [{ ref: "Invite a teammate", action: "fill", args: [{ email: "grace@", seats: 99 }] }] }),
  )
  expect(result.ok).toBe(false)
  expect(result.error?.message).toContain("Email: Enter an email address, like name@example.com.")
  expect(result.error?.message).toContain("Seats is at most 50.")
  await expect(form(page).getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true")
})

test("the form fits a phone's width, and its review stacks", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await open(page)
  await form(page).getByRole("textbox", { name: "Email" }).fill("grace@example.com")
  for (let step = 0; step < 3; step++) await actions(page).getByRole("button", { name: "Next" }).click()
  const box = (await form(page).boundingBox())!
  expect(box.x + box.width).toBeLessThanOrEqual(375)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    // Plain DOM queries only: in Playwright's Firefox a role query before an axe scan crashes the page.
    test(`passes axe in ${skin}, ${theme}, with a problem showing and on the review`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await openGallery(page, `/gallery?skin=${skin}&theme=${theme}`)
      const card = page.locator("section.example:has(.schema-form)")
      await card.locator("form").waitFor({ timeout: 20_000 })
      await card.scrollIntoViewIfNeeded()
      const next = () => card.locator(".schema-form-actions button[type=submit]").click()
      const email = card.locator("[data-schema-field=email] input")
      await next()
      await expect(email).toHaveAttribute("aria-invalid", "true")
      const scan = async () =>
        (await new AxeBuilder({ page }).include("section.example:has(.schema-form)").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`,
        )
      expect(await scan()).toEqual([])
      await email.fill("grace@example.com")
      for (let step = 0; step < 3; step++) await next()
      await card.locator(".schema-form-review").waitFor()
      expect(await scan()).toEqual([])
    })
  }
}
