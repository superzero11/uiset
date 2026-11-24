import { renderToString } from "@solidjs/web"
import { Button } from "@ui-sdk/solid/button"
import { expect, test } from "vitest"
import { UISet } from "@/solid/src/uiset"

// On the server, as SolidStart renders it: no window, no document.

test("the root renders on the server with its attributes, and UI SDK's parts inside it", () => {
  const html = renderToString(() => (
    <UISet skin="ink" theme="dark" motion="reduce" keyColor={{ l: 0.6, c: 0.15, h: 250 }} id="app">
      <Button>Save</Button>
    </UISet>
  ))
  // Solid writes an empty attribute bare: data-uiset, data-key.
  expect(html).toMatch(/^<div data-uiset[ >]/)
  for (const attr of ['data-skin="ink"', 'data-theme="dark"', 'data-motion="reduce"', " data-key ", 'data-sound="off"', 'data-haptics="on"', 'id="app"'])
    expect(html).toContain(attr)
  expect(html).toMatch(/style="[^"]*--uiset-key-h: ?250/)
  expect(html).toMatch(/<button[^>]*data-slot="button"[^>]*>Save<\/button>/)
})
