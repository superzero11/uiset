import { expect, test } from "@playwright/test"

// The built files, loaded as another site would load them (`pnpm check` builds first).
test("the built module and stylesheet register UISet's elements and skin UI SDK's", async ({ page }) => {
  await page.goto("/built.html")
  const root = page.locator("uiset-root")
  await expect(root).toHaveAttribute("data-skin", "studio")
  const knob = page.getByRole("slider", { name: "Cutoff" })
  await expect(knob).toHaveAttribute("aria-valuenow", "25")
  await expect(page.locator("uiset-knob-value")).toHaveText("25")
  // Studio's caps on buttons come from the built stylesheet.
  await expect(page.getByRole("button", { name: "Save" })).toHaveCSS("text-transform", "uppercase")
})
