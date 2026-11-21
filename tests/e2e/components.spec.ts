import AxeBuilder from "./axe"
import { expect, test } from "@playwright/test"
import { groups } from "@/src/site/examples/meta"
import { openGallery } from "./gallery"

const skins = ["base", "blueprint", "studio", "phosphor", "ink"]
const themes = ["light", "dark"]

for (const skin of skins) {
  for (const theme of themes) {
    test(`every component passes axe in ${skin}, ${theme}`, { tag: "@engine" }, async ({ page }) => {
      // Every live example, a group at a time: each group is a page of its own, so no browser
      // holds them all (the whole gallery grew WebKit to 5 GB). WebKit and Firefox take longer.
      test.slow()
      await page.emulateMedia({
        reducedMotion: "reduce",
        colorScheme: theme as "light" | "dark",
      })
      const report: string[] = []
      for (const [group] of groups) {
        await openGallery(page, `/gallery?skin=${skin}&theme=${theme}&group=${encodeURIComponent(group)}`)
        await expect(page.locator(".components-surface")).toHaveAttribute("data-skin", skin, { timeout: 20_000 })
        await expect(page.locator(".gallery-group")).toHaveText([group])
        const results = await new AxeBuilder({ page })
          .include(".components-surface")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
        report.push(
          ...results.violations.map(
            (v) =>
              `${group}: ${v.id} (${v.nodes.length}): ${v.nodes
                .slice(0, 4)
                .map((n) => n.target.join(" "))
                .join(" | ")}`,
          ),
        )
      }
      expect(report).toEqual([])
    })
  }
}

test("no component on the page is nameless to agents", async ({ page }) => {
  await openGallery(page, "/gallery")
  const unnamed = await page.evaluate(() =>
    (
      window as unknown as {
        agent: {
          snapshot(): {
            label?: string
            component: string
            ref: string
            offPage?: boolean
          }[]
        }
      }
    ).agent
      .snapshot()
      .filter((entry) => !entry.offPage && entry.component !== "more" && !entry.label)
      .map((entry) => `${entry.component} ${entry.ref}`),
  )
  expect(unnamed).toEqual([])
})
