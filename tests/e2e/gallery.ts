import type { Page } from "@playwright/test"

/**
 * Opens the components page and waits until every example has drawn: the gallery draws the
 * first ones with the page and fills in the rest after (src/site/components-page.tsx).
 */
export async function openGallery(page: Page, url: string) {
  await page.goto(url)
  await page.locator(".gallery[data-ready]").waitFor({ timeout: 60_000 })
}

/**
 * Waits until no transition is running. Under reduced motion a popup still fades in for
 * 120ms, and axe measuring contrast mid-fade reads the text as too faint.
 */
export async function settled(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => !(a instanceof CSSTransition) || a.playState !== "running"))
}
