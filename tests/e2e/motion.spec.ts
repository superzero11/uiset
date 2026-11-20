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

// A disabled toolbar button that came on faded in under reduced motion, and axe read it
// mid-fade (2026-11-20): only what appears and disappears fades.
test("under reduced motion, a control changes at once while a popup fades", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(popover.path)
  const trigger = page.locator(popover.trigger).first()
  const durations = await trigger.evaluate((el) => getComputedStyle(el).transitionDuration.split(", "))
  expect(new Set(durations)).toEqual(new Set(["0s"]))
  expect(await opening(page, "base", popover)).toEqual({ opacity: 120 })
})

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

// While a modal dialog is still on the page, UI SDK takes a press outside it for one outside
// an open dialog and swallows the click (2026-11-20: the inbox's Sent link, right after
// sending). So a dialog leaves at once, and the next click lands.
for (const skin of ["base", "phosphor"]) {
  test(`in ${skin}, a click on the page lands right after a dialog closes`, async ({ page }) => {
    await page.addInitScript((s) => localStorage.setItem("uiset-site-skin", s), skin)
    await page.goto("/docs/components/dialog")
    await page.locator(".example [data-slot=dialog-trigger]").first().click()
    await expect(page.locator("[data-slot=dialog-content]")).toBeVisible()
    await page.evaluate(() => document.addEventListener("click", () => ((window as unknown as { landed: boolean }).landed = true)))
    await page.keyboard.press("Escape")
    await page.locator("h1").first().click()
    expect(await page.evaluate(() => (window as unknown as { landed?: boolean }).landed)).toBe(true)
  })
}


/* ------------------------------------------------------------------ on and off, refusals */

/** A checkbox's declared timing in its current state: duration, delay. */
const timing = (page: Page) =>
  page.locator(".example [data-slot=checkbox]").first().evaluate((el) => {
    const style = getComputedStyle(el)
    return [style.transitionDuration.split(", ")[0], style.transitionDelay.split(", ")[0]]
  })

// Base eases, Blueprint keeps an even pace, Studio's lamp warms fast and cools slowly,
// Phosphor's inverse video and Ink change at once.
const toggles: Record<string, { on: string; off: string }> = {
  base: { on: "0.15s", off: "0.15s" },
  blueprint: { on: "0.16s", off: "0.16s" },
  studio: { on: "0.06s", off: "0.3s" },
  phosphor: { on: "0s", off: "0s" },
  ink: { on: "0s", off: "0s" },
}

for (const [skin, { on, off }] of Object.entries(toggles)) {
  test(`${skin} turns a checkbox on in ${on} and off in ${off}, with no wait`, async ({ page }) => {
    await page.addInitScript((s) => localStorage.setItem("uiset-site-skin", s), skin)
    await page.goto("/docs/components/checkbox")
    const box = page.locator(".example [data-slot=checkbox]").first()
    if ((await box.getAttribute("data-checked")) !== null) await box.click()
    await expect(box).not.toHaveAttribute("data-checked")
    // UI SDK delays every button's transitions 300ms; a checkbox once waited that long.
    expect(await timing(page)).toEqual([off, "0s"])
    await box.click()
    await expect(box).toHaveAttribute("data-checked")
    expect(await timing(page)).toEqual([on, "0s"])
  })
}

test("under reduced motion, a checkbox turns on at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/docs/components/checkbox")
  const box = page.locator(".example [data-slot=checkbox]").first()
  await box.click()
  expect((await timing(page))[0]).toBe("0s")
})

test("Blueprint inks a check in from the start of the line", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("uiset-site-skin", "blueprint"))
  await page.goto("/docs/components/checkbox")
  const box = page.locator(".example [data-slot=checkbox]").first()
  if ((await box.getAttribute("data-checked")) !== null) await box.click()
  await expect(box).not.toHaveAttribute("data-checked")
  const check = { path: "/docs/components/checkbox", trigger: ".example [data-slot=checkbox]", part: "[data-slot=checkbox-indicator]" }
  const ran = await page.evaluate(async ({ trigger, part }) => {
    ;(document.querySelector(trigger) as HTMLElement).click()
    const seen: Record<string, string> = {}
    for (let frame = 0; frame < 8; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      for (const a of document.getAnimations()) {
        const effect = a.effect as KeyframeEffect | null
        if (a instanceof CSSTransition && effect?.target?.matches(part)) seen[a.transitionProperty] = String(effect.getKeyframes()[0]?.clipPath ?? "")
      }
    }
    return seen
  }, check)
  expect(ran["clip-path"]).toContain("100%")
})

test("an alert dialog nudges at a press outside it, each skin its own way", async ({ page }) => {
  await page.goto("/docs/components/alert-dialog")
  await page.locator(".example [data-slot=alert-dialog-trigger]").first().click()
  const dialog = page.locator("[data-slot=alert-dialog-content]")
  await expect(dialog).toBeVisible()
  await page.mouse.click(10, 700)
  await expect(dialog).toBeVisible()
  const names = await dialog.evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName))
  expect(names).toContain("uiset-nudge")
  // Each press nudges again.
  await expect(dialog).not.toHaveAttribute("data-refused")
  await page.mouse.click(10, 700)
  await expect(dialog).toHaveAttribute("data-refused", "")
})

test("under reduced motion, a refused press doesn't move the dialog", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/docs/components/alert-dialog")
  await page.locator(".example [data-slot=alert-dialog-trigger]").first().click()
  const dialog = page.locator("[data-slot=alert-dialog-content]")
  await expect(dialog).toBeVisible()
  await page.mouse.click(10, 700)
  expect(await dialog.evaluate((el) => getComputedStyle(el).animationDuration)).toBe("0s")
})

test("an error fades in, and appears at once in Phosphor", async ({ page }) => {
  for (const [skin, ms] of [["base", 150], ["phosphor", 0]] as const) {
    await page.addInitScript((s) => localStorage.setItem("uiset-site-skin", s), skin)
    await page.goto("/templates/inbox")
    await page.locator(".template-frame").getByRole("button", { name: "Compose" }).click()
    const form = page.getByRole("form", { name: "New message" })
    await expect(form).toBeVisible()
    const faded = await page.evaluate(async () => {
      ;[...document.querySelectorAll("button")].find((b) => b.textContent === "Send")!.click()
      const seen: number[] = []
      for (let frame = 0; frame < 8; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
        for (const a of document.getAnimations())
          if (a instanceof CSSTransition && (a.effect as KeyframeEffect).target?.matches('[data-slot="field-error"]')) seen.push(Number(a.effect!.getTiming().duration))
      }
      return seen[0] ?? 0
    })
    await expect(form.getByText("Add someone to send to.")).toBeVisible()
    expect(faded).toBe(ms)
  }
})
