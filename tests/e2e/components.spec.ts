import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const skins = ["base", "blueprint", "studio", "phosphor", "ink"]
const themes = ["light", "dark"]

for (const skin of skins) {
  for (const theme of themes) {
    test(`every component passes axe in ${skin}, ${theme}`, async ({ page }) => {
      // 79 live examples, and axe over all of them: WebKit and Firefox take longer.
      test.slow()
      await page.emulateMedia({
        reducedMotion: "reduce",
        colorScheme: theme as "light" | "dark",
      })
      await page.goto(`/components?skin=${skin}&theme=${theme}`)
      await expect(page.locator(".components-surface")).toHaveAttribute("data-skin", skin, { timeout: 20_000 })
      const results = await new AxeBuilder({ page })
        .include(".components-surface")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
      // Known UI SDK issue: the image cropper's selection is a slider with slider handles
      // inside it, and a slider's children are presentational. Reported upstream; when it's
      // fixed this expectation fails, and the exception should go.
      const upstream = results.violations.filter(
        (v) =>
          v.id === "nested-interactive" &&
          v.nodes.every((n) => n.target.join(" ").includes("image-cropper-selection")),
      )
      expect(
        upstream,
        "UI SDK fixed the image cropper; remove this exception",
      ).toHaveLength(1)
      const report = results.violations
        .filter((v) => !upstream.includes(v))
        .map(
          (v) =>
            `${v.id} (${v.nodes.length}): ${v.nodes
              .slice(0, 4)
              .map((n) => n.target.join(" "))
              .join(" | ")}`,
        )
      expect(report).toEqual([])
    })
  }
}

test("no component on the page is nameless to agents", async ({ page }) => {
  await page.goto("/components")
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
