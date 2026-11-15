import { expect, test, type Page } from "@playwright/test"
import { exampleMetas, exampleSlugByItem, uiSdkComponents } from "../../src/site/examples/meta"

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
    await page.goto("/components")
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
