import AxeBuilder from "./axe"
import { expect, test, type Locator, type Page } from "@playwright/test"
import { formatOklch, parseHex } from "../../src/site/generator/color"

// The theme generator: the key drives the preview and every export, a failing color gets a
// fix that passes, and the address bar brings the same theme back.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
})

const status = (page: Page) => page.locator(".generator-status")
const skinCss = (page: Page) => page.locator('pre[aria-label="Skin CSS"]')
const preview = (page: Page, scheme: "Light" | "Dark") => page.getByRole("region", { name: `${scheme} preview` })

/** Whether an element's computed color property is the same color as `expected`, both resolved by the browser. */
async function sameColor(element: Locator, property: "backgroundColor" | "color", expected: string) {
  return element.evaluate(
    (el, [property, expected]) => {
      const probe = document.createElement("span")
      probe.style.setProperty(property === "color" ? "color" : "background-color", expected!)
      el.parentElement!.append(probe)
      const want = getComputedStyle(probe)[property as "color"]
      probe.remove()
      return { got: getComputedStyle(el)[property as "color"], want }
    },
    [property, expected],
  )
}

for (const scheme of ["light", "dark"] as const) {
  test(`passes axe in the ${scheme} site theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
    await page.goto("/themes/generator")
    await expect(status(page)).toContainText("checks pass")
    const results = await new AxeBuilder({ page }).include(".generator").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([])
  })
}

test("a failing key still passes axe everywhere the generator derived the colors", async ({ page }) => {
  await page.goto("/themes/generator?key=0.8,0.16,80")
  await expect(status(page)).toContainText("fails")
  const results = await new AxeBuilder({ page }).include(".generator").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
})

test("changing the key updates the preview and every export", async ({ page }) => {
  await page.goto("/themes/generator")
  const before = await skinCss(page).textContent()
  await page.getByRole("textbox", { name: "Hex" }).fill("#0f766e")
  const key = formatOklch(parseHex("#0f766e")!)

  // The skin file, and the preview built from it, carry the new key.
  await expect(skinCss(page)).toContainText(`--ui-primary: light-dark(${key},`)
  expect(await skinCss(page).textContent()).not.toBe(before)
  const save = preview(page, "Light").getByRole("button", { name: "Save changes" })
  await expect(async () => {
    const { got, want } = await sameColor(save, "backgroundColor", key)
    expect(got).toBe(want)
  }).toPass()

  // The other formats follow.
  await page.getByRole("tab", { name: "shadcn/ui" }).click()
  await expect(page.locator('pre[aria-label="shadcn/ui CSS"]')).toContainText(`--primary: ${key};`)
  await page.getByRole("tab", { name: "Design tokens" }).click()
  const tokens = JSON.parse((await page.locator('pre[aria-label="Design tokens JSON"]').textContent())!)
  expect(tokens.light.ui.primary.$value.hex).toBe("#0f766e")
  await page.getByRole("tab", { name: "Link" }).click()
  await expect(page.locator('pre[aria-label="Link"]')).toContainText("key=")
})

test("presets and sliders drive the key", async ({ page }) => {
  await page.goto("/themes/generator")
  await page.getByRole("button", { name: "Teal" }).click()
  await expect(page.getByRole("button", { name: "Teal" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("textbox", { name: "Hex" })).not.toHaveValue("#3655cd")
  const hue = page.getByRole("slider", { name: "Hue" })
  await hue.focus()
  await page.keyboard.press("Home")
  await expect(hue).toHaveValue("0")
  await expect(page.getByRole("button", { name: "Teal" })).toHaveAttribute("aria-pressed", "false")
  await expect(skinCss(page)).toContainText(/--ui-primary: light-dark\(oklch\([\d.]+ [\d.]+ 0\)/)
})

test("a failing color offers a fix, and the fix passes", async ({ page }) => {
  await page.goto("/themes/generator")
  await page.getByRole("textbox", { name: "Hex" }).fill("#f3b01d")
  await expect(status(page)).toContainText("1 of 32 checks fails")
  const failing = page.locator("#generator-checks td:not([data-pass])")
  await expect(failing).toHaveCount(1)
  await expect(failing).toContainText("Fails")
  await expect(page.getByRole("row", { name: /Checked and selected controls/ })).toContainText("Fails")

  await failing.getByRole("button", { name: /^Use lightness 0\.\d+ for the key$/ }).click()
  await expect(status(page)).toContainText("All 32 checks pass")
  await expect(failing).toHaveCount(0)
  // The hue stayed; only the lightness moved.
  await expect(page).toHaveURL(/key=0\.\d+%2C0\.\d+%2C79\.\d+/)
})

test("fix all, from the inputs, passes too", async ({ page }) => {
  await page.goto("/themes/generator?key=0.9,0.2,200")
  await expect(status(page)).toContainText("fails")
  await status(page).getByRole("button", { name: /^Fix/ }).click()
  await expect(status(page)).toContainText("All 32 checks pass")
})

test("the URL restores the inputs", async ({ page }) => {
  await page.goto("/themes/generator")
  await page.getByRole("textbox", { name: "Hex" }).fill("#c026d3")
  const radius = page.getByRole("slider", { name: "Radius" })
  await radius.focus()
  await page.keyboard.press("End")
  await page.getByRole("radiogroup", { name: "Density" }).getByRole("radio", { name: "Roomy" }).click()
  await page.getByRole("radiogroup", { name: "Starting point" }).getByRole("radio", { name: "Dark first" }).click()
  await page.getByRole("switch", { name: "Lead the charts with the key" }).click()
  await expect(page).toHaveURL(/charts=uiset/)
  // The export follows the inputs a moment later (a deferred render keeps typing smooth).
  await expect(skinCss(page)).toContainText("charts=uiset")
  const css = await skinCss(page).textContent()

  await page.reload()
  await expect(page.getByRole("textbox", { name: "Hex" })).toHaveValue("#c026d3")
  await expect(page.getByRole("slider", { name: "Radius" })).toHaveValue("1.25")
  await expect(page.getByRole("radiogroup", { name: "Density" }).getByRole("radio", { name: "Roomy" })).toHaveAttribute("aria-checked", "true")
  await expect(page.getByRole("radiogroup", { name: "Starting point" }).getByRole("radio", { name: "Dark first" })).toHaveAttribute("aria-checked", "true")
  await expect(page.getByRole("switch", { name: "Lead the charts with the key" })).toHaveAttribute("aria-checked", "false")
  await expect(skinCss(page)).toHaveText(css!)
  // Dark first opens the preview on dark, and the switch shows light.
  await expect(page.locator(".generator-screen-frame")).toHaveAttribute("aria-label", "Dark preview")
  await page.getByRole("radiogroup", { name: "Preview mode" }).getByRole("radio", { name: "Light" }).click()
  await expect(page.locator(".generator-screen-frame")).toHaveAttribute("aria-label", "Light preview")
})

test("the skin downloads under its own name, and the preview uses that name", async ({ page }) => {
  await page.goto("/themes/generator")
  await page.getByRole("textbox", { name: "Skin name" }).fill("harbor")
  await expect(preview(page, "Light").locator("[data-uiset]").first()).toHaveAttribute("data-skin", "harbor")
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download harbor.css" }).click()])
  expect(download.suggestedFilename()).toBe("harbor.css")
  const text = await new Promise<string>((resolve, reject) => {
    void download.createReadStream().then((stream) => {
      let body = ""
      stream.on("data", (chunk) => (body += chunk))
      stream.on("end", () => resolve(body))
      stream.on("error", reject)
    })
  })
  expect(text).toContain('[data-uiset][data-skin="harbor"]')
  expect(text).toContain("--chart-seq-7: light-dark(")

  // A name UISet already uses is refused, and the preview keeps a safe one.
  await page.getByRole("textbox", { name: "Skin name" }).fill("ink")
  // The field's own error: UI SDK's announcer may say the same words for a moment.
  await expect(page.locator('[data-slot="field-error"]', { hasText: "UISet already has a skin called ink." })).toBeVisible()
  await expect(preview(page, "Light").locator("[data-uiset]").first()).toHaveAttribute("data-skin", "custom")
})
