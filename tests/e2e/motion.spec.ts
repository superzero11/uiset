import { expect, test, type Page } from "@playwright/test"

// Openings and closings per skin (design/motion-plan.md): each skin sets the timing and where
// an opening starts from; reduced motion keeps the fades and moves nothing.

const popover = { path: "/docs/components/popover", trigger: ".example [data-slot=popover-trigger]", part: "[data-slot=popover-content]" }
const accordion = { path: "/docs/components/accordion", trigger: ".example [data-slot=accordion-trigger]", part: "[data-slot=accordion-panel]" }

/** Opens the part and returns what moved or faded: property → duration in ms. A property
 *  going between two values that look the same (scale 1 to none) moves nothing. */
async function opening(page: Page, skin: string, target: typeof popover) {
  await page.addInitScript((s) => localStorage.setItem("uiset-site-skin", s), skin)
  await page.goto(target.path)
  await page.locator(target.trigger).first().scrollIntoViewIfNeeded()
  return page.evaluate(async ({ trigger, part }) => {
    ;(document.querySelector(trigger) as HTMLElement).click()
    const seen: Record<string, number> = {}
    for (let frame = 0; frame < 12; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      for (const animation of document.getAnimations()) {
        const target = (animation.effect as KeyframeEffect | null)?.target
        if (!(animation instanceof CSSTransition) || !target?.matches(part)) continue
        const values = (animation.effect as KeyframeEffect).getKeyframes().flatMap((frame) =>
          Object.entries(frame).filter(([key]) => !["offset", "computedOffset", "easing", "composite"].includes(key)).map(([, value]) => String(value)),
        )
        if (values.every((value) => ["none", "1", "0px", "0px 0px", "0px 0px 0px", "inset(0px)"].includes(value))) continue
        seen[animation.transitionProperty] = Number(animation.effect!.getTiming().duration)
      }
    }
    return seen
  }, target)
}

// Base fades and grows, Blueprint and Phosphor are drawn (a clip, no fade), Studio drops in.
const skins: Record<string, Record<string, number>> = {
  base: { opacity: 150, scale: 150 },
  blueprint: { "clip-path": 200 },
  studio: { opacity: 120, translate: 120 },
  phosphor: { "clip-path": 100 },
}

for (const [skin, ran] of Object.entries(skins)) {
  test(`${skin} opens a popover its own way`, async ({ page }) => {
    expect(await opening(page, skin, popover)).toEqual(ran)
  })

  test(`${skin} fades a popover under reduced motion and moves nothing`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    expect(await opening(page, skin, popover)).toEqual({ opacity: 120 })
  })
}

test("Ink opens a popover at once, with or without reduced motion", async ({ page }) => {
  expect(await opening(page, "ink", popover)).toEqual({})
  await page.emulateMedia({ reducedMotion: "reduce" })
  expect(await opening(page, "ink", popover)).toEqual({})
  await expect(page.locator(popover.part)).toBeVisible()
})

test("a panel grows from its measured height, and snaps open under reduced motion", async ({ page }) => {
  expect(await opening(page, "base", accordion)).toMatchObject({ height: 200 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  expect(await opening(page, "base", accordion)).toEqual({})
  await expect(page.locator(accordion.part).first()).toBeVisible()
})

test('motion="reduce" on a root fades and moves nothing, with the system setting off', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      new MutationObserver(() => {
        for (const root of document.querySelectorAll("[data-uiset]")) root.setAttribute("data-motion", "reduce")
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-uiset"] })
    })
  })
  expect(await opening(page, "blueprint", popover)).toEqual({ opacity: 120 })
})

test("Phosphor's slow fade never catches a click", async ({ page }) => {
  await opening(page, "phosphor", popover)
  await page.keyboard.press("Escape")
  const leaving = page.locator(`${popover.part}[data-ending-style]`)
  await expect(leaving).toHaveCSS("pointer-events", "none")
})

test("Blueprint's drawn popup keeps its offset shadow once it's open", async ({ page }) => {
  await opening(page, "blueprint", popover)
  const popup = page.locator(popover.part)
  await expect(popup).not.toHaveAttribute("data-starting-style")
  expect(await popup.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("6px 6px 0px")
  // Once drawn, the clip reaches past the shadow's 6px.
  await expect.poll(() => popup.evaluate((el) => getComputedStyle(el).clipPath)).toBe("inset(-8px)")
})
