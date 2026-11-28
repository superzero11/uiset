import AxeBuilder from "./axe"
import { expect, test } from "@playwright/test"

// Every kit item is live on its kit's page (lint content/kit-live): items the kit's demo
// doesn't use are drawn under their section, as on their own pages.

for (const [kit, heading, control] of [
  ["chat", "agent-parts", /Deploy preview/],
  ["forms", "inline-edit", /Project name/],
  ["forms", "tag-input", /Remove React/],
  ["forms", "phone-input", /Country: /],
  ["forms", "input-mask", /Card number/],
  ["forms", "upload", /Choose files/],
  ["app-shell", "table", /Invoices/],
] as const) {
  test(`the ${kit} kit draws ${heading} live under its heading, and passes axe`, { tag: "@engine" }, async ({ page, browserName }) => {
    // The tag and phone inputs' scans passed in Firefox at one worker and crashed at two: watch them.
    test.fixme(browserName === "firefox" && heading === "input-mask", "Playwright's Firefox crashes (\"Page crashed\") while axe scans this page, in Docker, on every try; Chrome and WebKit pass this scan, and Firefox passes the parts' gallery scans and this page's other tests (HISTORY.md decision log, 2026-11-28)")
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(`/docs/kits/${kit}`)
    const example = page.locator(`[id="${heading}"] + .docs-example`)
    await expect(example.locator("[data-ready]")).toBeVisible({ timeout: 20_000 })
    const role = heading === "table" ? "table" : heading === "input-mask" ? "textbox" : "button"
    await expect(example.getByRole(role, { name: control }).first()).toBeVisible()
    const results = await new AxeBuilder({ page }).include(`[id="${heading}"] + .docs-example`).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
  })
}
