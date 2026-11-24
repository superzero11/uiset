import { type Page } from "@playwright/test"
import { richTextTests } from "./rich-text-tests"

// The rich text kit on React's kit page; the tests are shared with Solid's (rich-text-tests.ts).

async function choose(page: Page, group: "Skin" | "Theme", option: string) {
  // The skin is the site's select; the theme a radio group.
  if (group === "Skin") {
    await page.getByRole("combobox", { name: "Site skin", exact: true }).click()
    await page.getByRole("option", { name: option, exact: true }).click()
  } else await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: option }).click()
}

richTextTests({ open: (page) => page.goto("/docs/kits/rich-text").then(() => undefined), frame: ".item-frame", choose })
