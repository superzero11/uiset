import { expect, test, type Page } from "@playwright/test"

// The Motion pieces (design/motion-pieces-plan.md) on the Motion kit page, each skin its own
// way; under reduced motion nothing moves, and people and agents read the real value.

async function open(page: Page, skin = "base") {
  await page.addInitScript((s) => localStorage.setItem("uiset-site-skin", s), skin)
  await page.goto("/docs/kits/motion")
  await expect(page.getByRole("button", { name: "Add a sale" })).toBeVisible()
}

const ticker = (page: Page) => page.locator('[data-slot="number-ticker"]').first()
/** What the ticker shows once it settles: the reels' digits, or the face's text. */
const settled = (page: Page) =>
  ticker(page).evaluate((el) => {
    const face = el.querySelector(".number-ticker-face")!
    if (!face.querySelector(".number-ticker-reel")) return face.textContent
    return [...face.children].map((c) => c.querySelector<HTMLElement>(".number-ticker-reel")?.style.getPropertyValue("--digit") ?? c.textContent).join("")
  })

const modes: Record<string, string> = { base: "roll", blueprint: "count", studio: "count", phosphor: "type", ink: "none" }

for (const [skin, mode] of Object.entries(modes)) {
  test(`${skin}: a number ${mode === "none" ? "redraws" : mode + "s"} to its new value, and reads as that value at once`, async ({ page }) => {
    await open(page, skin)
    await page.getByRole("button", { name: "Add a sale" }).click()
    await expect(ticker(page)).toHaveAttribute("data-mode", mode)
    // People and agents read the new value straight away, never the digits on the way.
    await expect(ticker(page).locator(".uiset-visually-hidden")).toHaveText("$14,130")
    await expect(ticker(page).locator(".number-ticker-face")).toHaveAttribute("aria-hidden", "true")
    await expect.poll(() => settled(page)).toBe("$14,130")
  })
}

test("under reduced motion, a number shows its new value at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await open(page)
  await page.getByRole("button", { name: "Add a sale" }).click()
  await expect(ticker(page)).toHaveAttribute("data-mode", "none")
  expect(await ticker(page).locator(".number-ticker-face").textContent()).toBe("$14,130")
})

test("a number counts up from where it starts once it's seen", { tag: "@engine" }, async ({ page }) => {
  await open(page, "blueprint")
  const teams = page.locator('[data-slot="number-ticker"]').nth(1)
  await teams.scrollIntoViewIfNeeded()
  await expect(teams.locator(".uiset-visually-hidden")).toHaveText("1,284")
  await expect(teams.locator(".number-ticker-face")).toHaveText("1,284")
})

const answer = (page: Page) => page.locator('[data-slot="text-reveal"]').first()

for (const [skin, by] of [["base", "word"], ["blueprint", "word"], ["phosphor", "letter"]] as const) {
  test(`${skin}: a streamed answer reveals each new ${by}, with the whole text in the page`, async ({ page }) => {
    await open(page, skin)
    await page.getByRole("button", { name: "Stream the answer" }).click()
    await expect(answer(page)).toHaveAttribute("data-by", by)
    await expect(answer(page).locator(".text-reveal-piece[data-new]").first()).toBeAttached()
    if (skin === "phosphor") await expect(answer(page).locator(".text-reveal-caret")).toBeAttached()
    await expect(answer(page)).toContainText("so catch that and move on.", { timeout: 10_000 })
  })
}

test("under reduced motion, streamed text appears whole, word by word as it comes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await open(page)
  await page.getByRole("button", { name: "Stream the answer" }).click()
  await expect(answer(page)).toContainText("so catch that and move on.", { timeout: 10_000 })
  await expect(answer(page).locator("[data-new]")).toHaveCount(0)
})

test("Thinking is a status said once, drawn in each skin's way and still under reduced motion", { tag: "@engine" }, async ({ page }) => {
  await open(page, "studio")
  const status = page.getByRole("status").filter({ hasText: "Searching the docs…" })
  await expect(status).toBeVisible()
  const leds = await status.locator(".thinking-mark > span").evaluateAll((els) => els.map((el) => el.getAnimations().length))
  expect(leds).toEqual([1, 1, 1])
  await page.emulateMedia({ reducedMotion: "reduce" })
  await expect(status.locator(".thinking-mark")).toBeHidden()
})

test("Ink's Thinking is words and still dots", { tag: "@engine" }, async ({ page }) => {
  await open(page, "ink")
  const mark = page.getByRole("status").first().locator(".thinking-mark")
  await expect(mark).toBeVisible()
  expect(await mark.locator("span").first().evaluate((el) => el.getAnimations().length)).toBe(0)
})

test("a crossfade swaps a plan in place: the old one leaves inert, and the box moves to size", async ({ page }) => {
  await open(page, "base")
  await page.getByRole("radio", { name: "Free" }).click()
  const swapping = page.locator('[data-slot="crossfade"][data-swapping]')
  await expect(swapping).toBeAttached()
  await expect(swapping.locator("> [data-leaving]")).toHaveAttribute("inert", "")
  await expect(swapping.locator("> [data-entering]")).toContainText("One project")
  await expect(page.locator('[data-slot="crossfade"] > *')).toHaveCount(1)
  await expect(page.locator('[data-slot="crossfade"]')).toContainText("Community support")
})

test("under reduced motion and in Ink, a crossfade swaps at once", async ({ page }) => {
  await open(page, "ink")
  await page.getByRole("radio", { name: "Team" }).click()
  await expect(page.locator('[data-slot="crossfade"][data-swapping]')).toHaveCount(0)
  await expect(page.locator('[data-slot="crossfade"]')).toContainText("Shared workspaces")
})
