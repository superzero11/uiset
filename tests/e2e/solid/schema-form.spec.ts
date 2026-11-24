import { expect, test, type Page } from "@playwright/test"

// The schema form in Solid on the components page, by keyboard as React's is checked
// (tests/e2e/schema-form.spec.ts): Safari doesn't focus a button a mouse presses, so there
// focus is never in the form to keep.

const form = (page: Page) => page.getByRole("form", { name: "Invite a teammate" })
const actions = (page: Page) => form(page).locator(".schema-form-actions")

test("Enter in any field of a step goes on, and focus follows each step", { tag: "@engine" }, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/components.html")
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
