import type { Page } from "@playwright/test"

/**
 * Opens the components page and waits until every example has drawn: the gallery draws the
 * first ones with the page and fills in the rest after (src/site/components-page.tsx).
 */
export async function openGallery(page: Page, url: string) {
  await page.goto(url)
  await page.locator(".gallery[data-ready]").waitFor({ timeout: 60_000 })
}
