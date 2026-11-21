import { expect, test } from "@playwright/test"

// The search field and copy button as web elements, on the plain HTML index: the same parts
// and behavior as their React twins. The stepper is in tests/unit/web-shell-parts.bridge.test.ts.
test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("the search field: / focuses it, typing shows Clear, Clear empties it and keeps focus", { tag: "@engine" }, async ({ page }) => {
  const field = page.locator("#search")
  const box = page.getByRole("searchbox", { name: "Search projects" })
  await expect(box).toHaveAttribute("aria-keyshortcuts", "/")
  await expect(field.locator(".search-field-hint")).toContainText("/")
  await page.locator("h1").click()
  await page.keyboard.press("/")
  await expect(box).toBeFocused()
  const changes = await field.evaluate((el) => {
    const seen: string[] = []
    el.addEventListener("valuechange", (e) => seen.push((e as CustomEvent<{ value: string }>).detail.value))
    ;(window as unknown as { seen: string[] }).seen = seen
    return seen.length
  })
  expect(changes).toBe(0)
  await page.keyboard.type("atlas")
  const clear = page.getByRole("button", { name: "Clear search projects" })
  await expect(clear).toBeVisible()
  await expect(field.locator(".search-field-hint")).toBeHidden()
  await clear.click()
  await expect(box).toHaveValue("")
  await expect(box).toBeFocused()
  expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen.at(-1))).toBe("")
})

test("the copy button copies its value and says Copied", { tag: "@engine" }, async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Playwright can grant clipboard access only in Chromium")
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  const button = page.getByRole("button", { name: "Copy install command" })
  await button.click()
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm i @uiset/web")
  await expect(page.getByRole("button", { name: "Copy install command" })).toBeVisible({ timeout: 4000 })
})
