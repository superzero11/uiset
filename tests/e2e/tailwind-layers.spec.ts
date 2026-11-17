import { expect, test, type Page } from "@playwright/test"
import { openGallery } from "./gallery"

// UISet in a Tailwind CSS 4 app, with nothing set up. What Tailwind puts on a page: its layer
// order, a reset in `base` that clears every element's padding and border, and utilities.
const tailwind = `@layer theme, base, components, utilities;
@layer base {
  *, ::before, ::after { box-sizing: border-box; border: 0 solid; margin: 0; padding: 0; }
  button { border-radius: 0; background-color: transparent; color: inherit; }
}
@layer utilities { .tw-red { color: rgb(255, 0, 0); } }`

/** Puts Tailwind's stylesheet first in <head>, where an app's global stylesheet loads. */
async function withTailwind(page: Page) {
  await page.addInitScript((css) => {
    const add = () => {
      const style = document.createElement("style")
      style.id = "tailwind"
      style.textContent = css
      document.head.append(style)
    }
    if (document.head) add()
    else
      new MutationObserver((_, observer) => {
        if (!document.head) return
        observer.disconnect()
        add()
      }).observe(document, { childList: true, subtree: true })
  }, tailwind)
}

const button = (page: Page) => page.getByRole("region", { name: "Button", exact: true }).locator("[data-slot=button]").first()
/** The gallery is long, and slow to load in WebKit from a cold dev server. */
const ready = (page: Page) => expect(button(page)).toBeVisible({ timeout: 20_000 })
const look = (page: Page) =>
  button(page).evaluate((el) => {
    const s = getComputedStyle(el)
    // What UISet sets. Tailwind's reset rightly clears what it doesn't, like a button's default 1px
    // of padding above and below.
    return [s.paddingLeft, s.paddingRight, s.borderTopWidth, s.borderTopStyle, s.borderTopLeftRadius, s.backgroundColor, s.height]
  })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
})

test("Tailwind's reset doesn't strip UISet's controls", async ({ page }) => {
  await openGallery(page, "/components")
  await ready(page)
  const plain = await look(page)
  await withTailwind(page)
  await openGallery(page, "/components")
  await ready(page)
  expect(await look(page)).toEqual(plain)
})

test("Tailwind's utility classes win over UISet's styles", async ({ page }) => {
  await withTailwind(page)
  await openGallery(page, "/components")
  await ready(page)
  await button(page).evaluate((el) => el.classList.add("tw-red"))
  await expect(button(page)).toHaveCSS("color", "rgb(255, 0, 0)")
  // UI SDK's layer first, then UISet's between Tailwind's base and components.
  expect(await page.locator("#uiset-layer-order").evaluate((el) => el.textContent)).toMatch(/^@layer ui-sdk,.* base, uiset, components\b/)
})

test("a page without Tailwind keeps the layer order it has", async ({ page }) => {
  await openGallery(page, "/components")
  await ready(page)
  await expect(page.locator("#uiset-layer-order")).toHaveCount(0)
})
