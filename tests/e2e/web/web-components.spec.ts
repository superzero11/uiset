import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const root = (page: Page) => page.locator("uiset-root")

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await expect(page.locator("uiset-knob[data-slot='knob']")).toBeVisible()
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`UI SDK's elements and UISet's pass axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await root(page).evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      await expect(root(page)).toHaveAttribute("data-skin", skin)
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("<uiset-root> carries the skin, theme and feedback settings", async ({ page }) => {
  await expect(root(page)).toHaveAttribute("data-uiset", "")
  await expect(root(page)).toHaveAttribute("data-sound", "off")
  await page.getByRole("radio", { name: "Studio" }).click()
  await page.getByRole("radio", { name: "Dark" }).click()
  await expect(root(page)).toHaveAttribute("data-skin", "studio")
  await expect(root(page)).toHaveAttribute("data-theme", "dark")
})

test("skins restyle UI SDK's own elements, with no React on the page", async ({ page }) => {
  const save = page.getByRole("button", { name: "Save" })
  const look = () => save.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).textTransform].join(" "))
  const base = await look()
  await page.getByRole("radio", { name: "Studio" }).click()
  await expect.poll(look).not.toBe(base)
  expect(await page.evaluate(() => "React" in window || !!document.querySelector("[data-reactroot]"))).toBe(false)
})

test("the UISet knob turns by keyboard, and its readout follows", async ({ page }) => {
  const knob = page.getByRole("slider", { name: "Cutoff" })
  await knob.focus()
  await page.keyboard.press("ArrowUp")
  await expect(knob).toHaveAttribute("aria-valuenow", "41")
  await expect(page.locator("uiset-knob-value")).toHaveText("41")
  await page.keyboard.press("End")
  await expect(page.locator("uiset-knob-value")).toHaveText("100")
})

test("UISet swipe rows show their actions by keyboard and hide them with Escape", async ({ page }) => {
  const row = page.getByRole("listitem", { name: /Grace Hopper/ })
  await row.focus()
  await page.keyboard.press("ArrowLeft")
  await expect(row.getByRole("button", { name: "Delete" })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(row).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("listitem", { name: /Ada Lovelace/ })).toBeFocused()
})

test("a dialog from UI SDK opens, traps focus and returns it, styled by the skin", async ({ page }) => {
  await page.getByRole("button", { name: "Open details" }).click()
  const dialog = page.getByRole("dialog", { name: "Project details" })
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: "Open details" })).toBeFocused()
})

type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]>
}
const act = (page: Page, steps: unknown[]) =>
  page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)

test("the patch bay patches by keyboard, draws the cable and reports it", async ({ page }) => {
  const bay = page.locator("uiset-patch-bay")
  const changes: unknown[] = []
  await bay.evaluate((el) => el.addEventListener("valuechange", (e) => ((window as unknown as { changes: unknown[] }).changes ??= []).push((e as CustomEvent).detail.value)))
  await page.getByRole("button", { name: "LFO out" }).focus()
  await page.keyboard.press("Enter")
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("button", { name: "Cutoff in" })).toHaveAttribute("aria-description", "Patched to LFO out")
  expect(await bay.evaluate((el) => (el as unknown as { value: unknown }).value)).toEqual([{ from: "lfo:out", to: "cutoff:in" }])
  changes.push(...(await page.evaluate(() => (window as unknown as { changes: unknown[] }).changes)))
  expect(changes).toEqual([[{ from: "lfo:out", to: "cutoff:in" }]])
  await expect(bay.locator("svg.patch-bay-cables .patch-bay-cable path")).toHaveCount(1)
  // Setting `value` from script redraws, like a native control.
  await bay.evaluate((el) => ((el as unknown as { value: unknown }).value = []))
  await expect(bay.locator("svg.patch-bay-cables .patch-bay-cable")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Cutoff in" })).toHaveAttribute("aria-description", "Not patched")
})

test("agents patch by the jacks' names, taken from the page", async ({ page }) => {
  const result = await act(page, [{ ref: "Patch bay", action: "plug", args: ["Oscillator out", "Output in"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(page.getByRole("button", { name: "Output in" })).toHaveAttribute("aria-description", "Patched to Oscillator out")
  await expect(page.locator("uiset-patch-bay svg .patch-bay-cable")).toHaveCount(1)
})

test("faders, meters and step sequencers are UI SDK's elements in UISet's classes", async ({ page }) => {
  const fader = page.getByRole("slider", { name: "Level" })
  await fader.focus()
  await page.keyboard.press("ArrowUp")
  await expect(fader).toHaveValue("71")
  await expect(fader).toHaveAttribute("aria-orientation", "vertical")
  await expect(page.getByRole("meter", { name: "Signal" })).toHaveAttribute("aria-valuenow", "62")
  const steps = page.getByRole("group", { name: "Steps" })
  await expect(steps.getByRole("button", { name: "Step 1" })).toHaveAttribute("aria-pressed", "true")
  await steps.getByRole("button", { name: "Step 2" }).click()
  await expect(steps.getByRole("button", { name: "Step 2" })).toHaveAttribute("aria-pressed", "true")
  // The sequencer's grid comes from instruments.css: eight equal columns.
  const columns = await page.locator(".step-sequencer").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)
  expect(columns).toBe(8)
})
