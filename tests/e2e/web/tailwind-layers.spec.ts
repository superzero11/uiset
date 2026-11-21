import { expect, test, type Page } from "@playwright/test"

// The Web Components build in a page that also loads Tailwind CSS 4, with nothing set up:
// Tailwind's layer order, its reset in `base`, and a utility class.
const tailwind = `@layer theme, base, components, utilities;
@layer base {
  *, ::before, ::after { box-sizing: border-box; border: 0 solid; margin: 0; padding: 0; }
  button { border-radius: 0; background-color: transparent; color: inherit; }
}
@layer utilities { .tw-red { color: rgb(255, 0, 0); } }`

async function withTailwind(page: Page) {
  await page.addInitScript((css) => {
    const add = () => {
      const style = document.createElement("style")
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

const inbox = (page: Page) => page.locator("ui-button > button", { hasText: "Inbox" })
const look = (page: Page) =>
  inbox(page).evaluate((el) => {
    const s = getComputedStyle(el)
    // What UISet sets. Tailwind's reset rightly clears what it doesn't, like a button's default 1px
    // of padding above and below.
    return [s.paddingLeft, s.paddingRight, s.borderTopWidth, s.borderTopStyle, s.borderTopLeftRadius, s.backgroundColor, s.height]
  })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
})

test("Tailwind's reset doesn't strip UISet's web controls", async ({ page }) => {
  await page.goto("/content.html")
  await expect(inbox(page)).toBeVisible()
  const plain = await look(page)
  await withTailwind(page)
  await page.goto("/content.html")
  await expect(inbox(page)).toBeVisible()
  expect(await look(page)).toEqual(plain)
})

test("Tailwind's utility classes win over UISet's web styles", { tag: "@engine" }, async ({ page }) => {
  await withTailwind(page)
  await page.goto("/content.html")
  await inbox(page).evaluate((el) => el.classList.add("tw-red"))
  await expect(inbox(page)).toHaveCSS("color", "rgb(255, 0, 0)")
})
