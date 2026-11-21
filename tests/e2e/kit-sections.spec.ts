import AxeBuilder from "./axe"
import { expect, test } from "@playwright/test"

// Every kit item is live on its kit's page (lint content/kit-live): items the kit's demo
// doesn't use are drawn under their section, as on their own pages.

for (const [kit, heading, control] of [
  ["chat", "agent-parts", /Deploy preview/],
  ["forms", "inline-edit", /Project name/],
  ["forms", "upload", /Choose files/],
  ["app-shell", "table", /Invoices/],
] as const) {
  test(`the ${kit} kit draws ${heading} live under its heading, and passes axe`, { tag: "@engine" }, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(`/docs/kits/${kit}`)
    const example = page.locator(`[id="${heading}"] + .docs-example`)
    await expect(example.locator("[data-ready]")).toBeVisible({ timeout: 20_000 })
    await expect(example.getByRole(heading === "table" ? "table" : "button", { name: control }).first()).toBeVisible()
    const results = await new AxeBuilder({ page }).include(`[id="${heading}"] + .docs-example`).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
  })
}
