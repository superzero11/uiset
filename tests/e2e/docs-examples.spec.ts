import { expect, test, type Page } from "@playwright/test"
import { exampleMetas, exampleSlugByItem, uiSdkComponents } from "../../src/site/examples/meta"
import { openGallery } from "./gallery"

// A component's example looks the same on its docs page as on the components page. The docs'
// prose styles (headings, paragraphs, line height) once reached into live examples: a dialog's
// and a calendar's titles came out at the article's heading size with its top margin. And the
// docs frame stretched examples to twice a gallery card's width.

const props = ["font-size", "line-height", "font-weight", "margin-top", "margin-bottom", "padding-top", "padding-bottom"]

function styles(page: Page, root: string) {
  return page.locator(root).first().evaluate((body, keys) => {
    const out: string[] = []
    for (const el of [body, ...body.querySelectorAll("*")]) {
      const cs = getComputedStyle(el)
      if (cs.display === "none") continue
      out.push(`${el.tagName.toLowerCase()}${el.getAttribute("data-slot") ? `[${el.getAttribute("data-slot")}]` : ""} ${keys.map((k) => cs.getPropertyValue(k)).join(" ")}`)
    }
    return out
  }, props)
}

test.describe.configure({ mode: "parallel" })

for (const item of uiSdkComponents) {
  test(`${item}'s example looks the same on its docs page`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    const meta = exampleMetas.find((m) => m.slug === exampleSlugByItem.get(item))!
    const id = `example-${meta.title.toLowerCase().replace(/\W+/g, "-")}`

    // The components page draws all 79 examples; WebKit and Firefox take longer over it.
    test.slow()
    await openGallery(page, "/gallery")
    const gallery = `section.example:has(#${id}) .example-body`
    await expect(page.locator(gallery)).toBeVisible({ timeout: 20_000 })
    const expected = await styles(page, gallery)
    const galleryWidth = (await page.locator(gallery).boundingBox())!.width

    await page.goto(`/docs/components/${item}`)
    const docs = ".docs-preview .example-body"
    await expect(page.locator(`${docs} > :not(.example-note)`).first()).toBeVisible({ timeout: 20_000 })
    expect(await styles(page, docs)).toEqual(expected)
    if (!meta.wide) {
      const docsWidth = (await page.locator(docs).boundingBox())!.width
      expect(Math.abs(docsWidth - galleryWidth), `docs ${docsWidth}px, gallery ${galleryWidth}px`).toBeLessThan(galleryWidth * 0.15)
    }
  })
}

// A popup opens next to its trigger on a docs page. The docs' example once kept a loading
// example's 8rem of room after it drew, so its trigger stretched to fill it and the hover card
// opened far below the link.
test("a hover card opens next to its link on its docs page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/docs/components/hover-card")
  const trigger = page.locator(".docs-preview [data-slot='hover-card-trigger']").first()
  await trigger.hover()
  const card = page.locator("[data-slot='hover-card-content']")
  await expect(card).toBeVisible({ timeout: 10_000 })
  const [link, popup] = [(await trigger.boundingBox())!, (await card.boundingBox())!]
  expect(link.height).toBeLessThan(40)
  expect(Math.abs(popup.y - (link.y + link.height))).toBeLessThan(16)
})
