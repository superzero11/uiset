import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, expect, test, vi } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import { ThemeGeneratorPage } from "@/src/site/generator/page"
import { createBridge, settle } from "./bridge"

// The theme generator (/themes/generator), driven through the agent bridge: the fix for
// failing colors, and the skin file under its own name. Moved from
// tests/e2e/theme-generator.spec.ts.

const bridge = createBridge()
const status = () => document.querySelector(".generator-status")!
const lightPreview = () => screen.getByRole("region", { name: "Light preview" })

// jsdom saves no files: the page's download (a blob URL on a link it clicks) is caught here,
// with the name it asks for and the text it holds.
const downloads: { name: string; blob: Blob }[] = []
beforeAll(() => {
  let blob: Blob | undefined
  URL.createObjectURL = (object: Blob | MediaSource) => ((blob = object as Blob), "blob:uiset-test")
  URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    if (this.download && blob) downloads.push({ name: this.download, blob })
  })
})
afterEach(() => {
  downloads.length = 0
  window.history.replaceState(null, "", "/")
})

async function open(path: string) {
  window.history.replaceState(null, "", path)
  render(
    <UISet>
      <ThemeGeneratorPage />
    </UISet>,
  )
  await settle()
}

test("fix all, from the inputs, passes too", async () => {
  await open("/themes/generator?key=0.9,0.2,200")
  expect(status().textContent).toContain("fails")
  await bridge.press(/^Fix/)
  await waitFor(() => expect(status().textContent).toContain("All 32 checks pass"))
})

test("the skin downloads under its own name, and the preview uses that name", async () => {
  await open("/themes/generator")
  await bridge.run("Skin name", "setValue", "harbor")
  await waitFor(() => expect(lightPreview().querySelector("[data-uiset]")?.getAttribute("data-skin")).toBe("harbor"))
  await bridge.press("Download harbor.css")
  expect(downloads.map((d) => d.name)).toEqual(["harbor.css"])
  const text = await downloads[0]!.blob.text()
  expect(text).toContain('[data-uiset][data-skin="harbor"]')
  expect(text).toContain("--chart-seq-7: light-dark(")

  // A name UISet already uses is refused, and the preview keeps a safe one.
  await bridge.run("Skin name", "setValue", "ink")
  // The field's own error: UI SDK's announcer may say the same words for a moment.
  await waitFor(() =>
    expect([...document.querySelectorAll('[data-slot="field-error"]')].map((e) => e.textContent)).toContain("UISet already has a skin called ink."),
  )
  expect(lightPreview().querySelector("[data-uiset]")?.getAttribute("data-skin")).toBe("custom")
})
