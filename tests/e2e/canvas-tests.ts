import { expect, test, type Page } from "@playwright/test"

// The canvas kit's browser tests, one body for React's gallery (canvas.spec.ts) and Solid's
// canvas page (solid/canvas.spec.ts). Panning, moving, selecting, wiring and keys are one
// primitive (canvas/canvas.ts), and both pages show the same Workflow example, so the same
// tests must pass on both.

type Target = {
  /** Opens the page with the Workflow example; `search` is a query like "?skin=ink&theme=light". */
  open: (page: Page, search?: string) => Promise<void>
  /** Opens the kit's own page, whose canvas fills the width it's given. */
  kit: (page: Page) => Promise<void>
}

const canvas = (page: Page) => page.getByRole("group", { name: "Workflow", exact: true })
const node = (page: Page, name: string | RegExp) => canvas(page).getByRole("option", { name })
const demo = (page: Page) => page.locator(".canvas-demo")
const zoomLabel = (page: Page) => canvas(page).getByRole("button", { name: /^Zoom \d+%/ })
const tick = (page: Page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

function canvasTests(target: Target) {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await target.open(page)
    await canvas(page).scrollIntoViewIfNeeded()
    await tick(page)
  })

  test("drag a node: it moves, and its wires follow", { tag: "@engine" }, async ({ page, browserName }) => {
    test.fixme(browserName === "firefox", "Playwright's Firefox crashes (signal 11) while automation inspects this page; normal use doesn't (HISTORY.md decision log, 2026-11-15)")
    const search = node(page, /^Search docs/)
    const before = (await search.boundingBox())!
    const wireBefore = await canvas(page).locator('path[data-slot="canvas-wire"]').evaluateAll((paths) => paths.map((p) => p.getAttribute("d")))
    await page.mouse.move(before.x + 60, before.y + 12)
    await page.mouse.down()
    await page.mouse.move(before.x + 80, before.y + 50, { steps: 6 })
    await page.mouse.move(before.x + 100, before.y + 92, { steps: 6 })
    // Mid-drag, the wires already follow: they're live, not waiting for the drop.
    const midDrag = await canvas(page).locator('path[data-slot="canvas-wire"]').evaluateAll((paths) => paths.map((p) => p.getAttribute("d")))
    expect(midDrag).not.toEqual(wireBefore)
    await page.mouse.up()
    const after = (await search.boundingBox())!
    expect(after.y - before.y).toBeGreaterThan(40)
    const wireAfter = await canvas(page).locator('path[data-slot="canvas-wire"]').evaluateAll((paths) => paths.map((p) => p.getAttribute("d")))
    expect(wireAfter).not.toEqual(wireBefore)
    // Undo puts it back.
    await demo(page).getByRole("button", { name: "Undo" }).click()
    await expect.poll(async () => (await search.boundingBox())!.y).toBeCloseTo(before.y, 0)
  })

  test("arrows go to the nearest node that way; Alt with arrows moves it", { tag: "@engine" }, async ({ page }) => {
    await node(page, /^User question/).focus()
    await page.keyboard.press("ArrowRight")
    await expect(canvas(page).locator(":focus")).toHaveAccessibleName(/^(Answer template|Search docs)/)
    await node(page, /^Draft answer/).focus()
    await page.keyboard.press("ArrowRight")
    await expect(node(page, /^Reply/)).toBeFocused()
    const before = (await node(page, /^Reply/).boundingBox())!
    await page.keyboard.press("Alt+ArrowDown")
    await page.keyboard.press("Alt+ArrowDown")
    await expect.poll(async () => (await node(page, /^Reply/).boundingBox())!.y).toBeGreaterThan(before.y + 5)
    await expect(node(page, /^Reply/)).toBeFocused()
  })

  test("Space selects; Delete removes the selection, focus moves on, and Undo brings it back with its wires", { tag: "@engine" }, async ({ page }) => {
    await node(page, /^Search docs/).focus()
    await page.keyboard.press("Space")
    await expect(node(page, /^Search docs/)).toHaveAttribute("aria-selected", "true")
    await expect(page.getByRole("heading", { name: "Search docs" })).toBeVisible()
    await page.keyboard.press("Delete")
    await expect(node(page, /^Search docs/)).toHaveCount(0)
    await expect(canvas(page).getByRole("option").and(page.locator(":focus"))).toHaveCount(1)
    await expect(canvas(page).locator('path[data-slot="canvas-wire"]')).toHaveCount(3)
    await page.keyboard.press("ControlOrMeta+z")
    await expect(node(page, /^Search docs/)).toBeVisible()
    await expect(canvas(page).locator('path[data-slot="canvas-wire"]')).toHaveCount(5)
  })

  test("Shift-drag across empty space selects a box of nodes", { tag: "@engine" }, async ({ page }) => {
    const a = (await node(page, /^Answer template/).boundingBox())!
    const b = (await node(page, /^Search docs/).boundingBox())!
    await page.keyboard.down("Shift")
    await page.mouse.move(a.x - 20, a.y - 12)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width + 12, b.y + b.height + 12, { steps: 10 })
    await page.mouse.up()
    await page.keyboard.up("Shift")
    await expect(node(page, /^Answer template/)).toHaveAttribute("aria-selected", "true")
    await expect(node(page, /^Search docs/)).toHaveAttribute("aria-selected", "true")
    await expect(node(page, /^Draft answer/)).toHaveAttribute("aria-selected", "false")
    await expect(demo(page).getByRole("button", { name: "Remove 2 nodes" })).toBeEnabled()
  })

  test("C starts a wire from the keyboard: arrows choose an input, Enter connects", { tag: "@engine" }, async ({ page }) => {
    // Remove the wire into Reply, then make it again by keyboard.
    await node(page, /^Reply/).focus()
    await page.keyboard.press("Space")
    await demo(page).getByRole("button", { name: /^Disconnect Draft answer · Text from Reply · Text/ }).click()
    await expect(canvas(page).locator('path[data-slot="canvas-wire"]')).toHaveCount(4)
    await node(page, /^Draft answer/).focus()
    await page.keyboard.press("c")
    await expect(canvas(page).locator('[data-connect="source"]')).toHaveCount(1)
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("Enter")
    await expect(canvas(page).locator('path[data-slot="canvas-wire"]')).toHaveCount(5)
    await expect(node(page, /^Reply/)).toHaveAccessibleDescription(/Inputs: Text from Draft answer Text/)
  })

  test("drag from an output port to an input port to wire them", { tag: "@engine" }, async ({ page }) => {
    await canvas(page).getByRole("button", { name: "Zoom to fit" }).click()
    await canvas(page).locator('g[data-slot="canvas-unwire"]').last().click()
    await expect(canvas(page).locator('path[data-slot="canvas-wire"]')).toHaveCount(4)
    const from = (await canvas(page).locator('[data-slot="canvas-port"][data-canvas-port="out"]').nth(3).boundingBox())!
    const to = (await node(page, /^Reply/).locator('[data-canvas-port="in"]').boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x - 30, to.y, { steps: 8 })
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 4 })
    await page.mouse.up()
    await expect(canvas(page).locator('path[data-slot="canvas-wire"]')).toHaveCount(5)
  })

  // The layout audit (2026-11-19): fitting the workflow into a phone opened it at 25%, with 12px
  // titles drawn at 3px. Too big to show whole at 60%, it opens at 80%, from where it starts.
  test("a canvas opens at a readable zoom on a phone, starting with the first node", { tag: "@engine" }, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await target.kit(page)
    const readout = canvas(page).locator("[data-canvas-zoom]")
    await expect(readout).toHaveAttribute("data-zoom", "80%")
    await expect(node(page, /^User question/)).toBeInViewport()
  })

  // The skins audit (2026-11-20): opening no smaller than 80% left Reply past the edge on a
  // desktop, where the whole workflow fits at about 70%.
  test("a canvas on a desktop opens with the whole graph in view", { tag: "@engine" }, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await target.kit(page)
    const frame = (await canvas(page).boundingBox())!
    for (const title of [/^User question/, /^Reply/]) {
      const box = (await node(page, title).boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(frame.x)
      expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width)
    }
  })

  test("zoom with the buttons and keys, pan by dragging empty space", { tag: "@engine" }, async ({ page }) => {
    const readout = canvas(page).locator("[data-canvas-zoom]")
    const start = await readout.getAttribute("data-zoom")
    await canvas(page).getByRole("button", { name: "Zoom in" }).click()
    await expect(readout).not.toHaveAttribute("data-zoom", start!)
    await zoomLabel(page).click()
    await expect(readout).toHaveAttribute("data-zoom", "100%")
    await expect(zoomLabel(page)).toHaveAccessibleName("Zoom 100%, reset to 100%")
    await node(page, /^Reply/).focus()
    await page.keyboard.press("-")
    await expect(readout).not.toHaveAttribute("data-zoom", "100%")
    const world = canvas(page).locator('[data-slot="canvas-world"]')
    const before = await world.evaluate((el) => el.style.transform)
    const frame = (await canvas(page).boundingBox())!
    await page.mouse.move(frame.x + 30, frame.y + frame.height - 120)
    await page.mouse.down()
    await page.mouse.move(frame.x + 130, frame.y + frame.height - 80, { steps: 8 })
    await page.mouse.up()
    expect(await world.evaluate((el) => el.style.transform)).not.toBe(before)
  })

  test("Add node puts a new node in view and focuses it", { tag: "@engine" }, async ({ page }) => {
    await demo(page).getByRole("button", { name: "Add node" }).click()
    await page.getByRole("menuitem", { name: "Tool" }).click()
    await expect(node(page, /^New tool/)).toBeFocused()
    await expect(node(page, /^New tool/)).toBeInViewport()
  })

  test("node edges, wires and ports clear 3:1 in every skin and theme", { tag: "@engine" }, async ({ page }) => {
    test.slow() // one page load per skin and theme
    for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
      for (const theme of ["light", "dark"]) {
        if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
        await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme as "light" | "dark" })
        await target.open(page, `?skin=${skin}&theme=${theme}`)
        await canvas(page).scrollIntoViewIfNeeded()
        const ratios = await canvas(page).evaluate((root) => {
          const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
          const rgb = (color: string) => {
            pen.clearRect(0, 0, 1, 1)
            pen.fillStyle = color
            pen.fillRect(0, 0, 1, 1)
            return [...pen.getImageData(0, 0, 1, 1).data].slice(0, 3)
          }
          const lum = (c: number[]) => {
            const [r, g, b] = c.map((v) => {
              const s = v / 255
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            })
            return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
          }
          const ratio = (a: string, b: string) => {
            const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m)
            return (x! + 0.05) / (y! + 0.05)
          }
          const surface = getComputedStyle(root).backgroundColor
          const card = root.querySelector<HTMLElement>(".canvas-node-card")!
          const wire = root.querySelector<SVGPathElement>(".canvas-wire")!
          const port = root.querySelector<HTMLElement>(".canvas-port")!
          return {
            node: ratio(getComputedStyle(card).borderTopColor, surface),
            wire: ratio(getComputedStyle(wire).stroke, surface),
            port: ratio(getComputedStyle(port).borderTopColor, getComputedStyle(card).backgroundColor),
          }
        })
        expect(ratios.node, `${skin} ${theme} node edge`).toBeGreaterThanOrEqual(3)
        expect(ratios.wire, `${skin} ${theme} wire`).toBeGreaterThanOrEqual(3)
        expect(ratios.port, `${skin} ${theme} port`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  test.describe("review fixes", () => {
    test("Add node works from the keyboard, and the new node takes focus", { tag: "@engine" }, async ({ page }) => {
      const add = demo(page).getByRole("button", { name: "Add node" })
      await add.focus()
      await page.keyboard.press("ArrowDown")
      await page.getByRole("menuitem", { name: "Model" }).focus()
      await page.keyboard.press("Enter")
      await expect(node(page, /^New model/)).toBeFocused()
    })

    test("the new node takes focus in the same task as the choice", { tag: "@engine" }, async ({ page }) => {
      await demo(page).getByRole("button", { name: "Add node" }).click()
      // Where focus is once the choice's task is done, before the next frame: a focus put off
      // to a later frame would still be on its way.
      const focused = await page.getByRole("menuitem", { name: "Tool" }).evaluate((item) => {
        ;(item as HTMLElement).click()
        return new Promise<string | null>((done) => setTimeout(() => done(document.activeElement?.getAttribute("aria-roledescription") ?? null)))
      })
      expect(focused).toBe("node")
      await expect(node(page, /^New tool/)).toBeFocused()
    })

    test("Enter on a node puts focus in its notes in the same task", { tag: "@engine" }, async ({ page }) => {
      await node(page, /^Draft answer/).focus()
      // Checked as the key event returns: the notes render and take focus within it.
      const focused = await node(page, /^Draft answer/).evaluate((el) => {
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
        return document.activeElement?.id ?? null
      })
      expect(focused).toBe("canvas-demo-detail")
    })

    test("the inspector shows one set of fields per node, and renames the node shown", { tag: "@engine" }, async ({ page }) => {
      for (const name of [/^Search docs/, /^Draft answer/, /^Reply/, /^User question/]) {
        await node(page, name).focus()
        await page.keyboard.press("Space")
        await page.keyboard.press("Escape")
      }
      await node(page, /^User question/).focus()
      await page.keyboard.press("Space")
      const inspector = page.locator(".canvas-inspector")
      await expect(inspector.getByRole("textbox", { name: "Title" })).toHaveCount(1)
      await expect(inspector.getByRole("textbox", { name: "Title" })).toHaveValue("User question")
      await expect(inspector.getByRole("textbox", { name: "Notes" })).toHaveValue("From the chat box")
      await inspector.getByRole("textbox", { name: "Title" }).fill("Question")
      await inspector.getByRole("button", { name: "Rename" }).click()
      await expect(node(page, /^Question/)).toBeVisible()
      await expect(node(page, /^Search docs/)).toBeVisible()
    })

    test("Disconnect in the inspector hands focus to the next wire, then the node", { tag: "@engine" }, async ({ page }) => {
      await node(page, /^User question/).focus()
      await page.keyboard.press("Space")
      const inspector = page.locator(".canvas-inspector")
      await inspector.getByRole("button", { name: /^Disconnect/ }).first().click()
      await expect(inspector.getByRole("button", { name: /^Disconnect/ })).toHaveCount(1)
      await expect(inspector.getByRole("button", { name: /^Disconnect/ })).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(node(page, /^User question/)).toBeFocused()
    })

    test("removing from the toolbar and undoing an add never drop focus to the page", { tag: "@engine" }, async ({ page }) => {
      await node(page, /^Reply/).focus()
      await page.keyboard.press("Space")
      await demo(page).getByRole("button", { name: "Remove node" }).click()
      await page.waitForTimeout(100)
      expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY")

      await demo(page).getByRole("button", { name: "Add node" }).click()
      await page.getByRole("menuitem", { name: "Tool" }).click()
      await expect(node(page, /^New tool/)).toBeFocused()
      await page.keyboard.press("Space")
      await page.keyboard.press("ControlOrMeta+z")
      await expect(node(page, /^New tool/)).toHaveCount(0)
      await expect(canvas(page).getByRole("option").and(page.locator(":focus"))).toHaveCount(1)
      // The gone node left the selection, so there's nothing to remove.
      await expect(demo(page).getByRole("button", { name: "Remove node" })).toHaveAttribute("aria-disabled", "true")
      await expect(demo(page).getByRole("button", { name: "Redo" })).not.toHaveAttribute("aria-disabled", "true")
    })

    test("an agent's addNode leaves the person's focus where it is", { tag: "@engine" }, async ({ page }) => {
      await node(page, /^Reply/).focus()
      await page.keyboard.press("Space")
      const notes = page.locator(".canvas-inspector").getByRole("textbox", { name: "Notes" })
      await notes.focus()
      await page.evaluate(() =>
        (window as unknown as { agent: { act: (x: unknown) => Promise<unknown> } }).agent.act({
          steps: [{ ref: "Workflow", action: "addNode", args: ["Tool", "Fetch"] }],
        }),
      )
      await expect(node(page, /^Fetch/)).toBeVisible()
      await expect(notes).toBeFocused()
    })

    test("a keyboard wire ends when focus leaves the canvas", { tag: "@engine" }, async ({ page }) => {
      await node(page, /^Reply/).focus()
      await page.keyboard.press("Space")
      await node(page, /^Draft answer/).focus()
      await page.keyboard.press("c")
      await expect(canvas(page).locator('[data-connect="source"]')).toHaveCount(1)
      await page.locator(".canvas-inspector").getByRole("textbox", { name: "Notes" }).click()
      await expect(canvas(page).locator('[data-connect="source"]')).toHaveCount(0)
    })

    test("a keyboard wire lets Tab move on, and ends when focus leaves", { tag: "@engine" }, async ({ page }) => {
      await node(page, /^Draft answer/).focus()
      await page.keyboard.press("c")
      await expect(canvas(page).locator('[data-connect="source"]')).toHaveCount(1)
      await page.keyboard.press("Tab")
      await expect(node(page, /^Draft answer/)).not.toBeFocused()
      await expect(canvas(page).locator('[data-connect="source"]')).toHaveCount(0)
    })

    test("the minimap pans steadily while dragged", { tag: "@engine" }, async ({ page }) => {
      const map = (await page.locator(".canvas-minimap svg").boundingBox())!
      const world = canvas(page).locator('[data-slot="canvas-world"]')
      await page.mouse.move(map.x + map.width - 4, map.y + map.height / 2)
      await page.mouse.down()
      const seen: string[] = []
      for (let i = 0; i < 8; i++) {
        await page.mouse.move(map.x + map.width - 4 + (i % 2), map.y + map.height / 2)
        seen.push(await world.evaluate((el) => el.style.transform))
      }
      await page.mouse.up()
      expect(new Set(seen).size).toBeLessThanOrEqual(2)
    })

    test("pressing a node partly out of view doesn't pan the canvas", { tag: "@engine" }, async ({ page }) => {
      const world = canvas(page).locator('[data-slot="canvas-world"]')
      await canvas(page).getByRole("button", { name: "Zoom in" }).click()
      await canvas(page).getByRole("button", { name: "Zoom in" }).click()
      const before = await world.evaluate((el) => el.style.transform)
      const frame = (await canvas(page).boundingBox())!
      const reply = (await node(page, /^Reply/).boundingBox())!
      const x = Math.min(reply.x + 20, frame.x + frame.width - 10)
      await page.mouse.click(x, reply.y + 12)
      expect(await world.evaluate((el) => el.style.transform)).toBe(before)
    })

    test("in a right-to-left page, wires still meet their ports", { tag: "@engine" }, async ({ page }) => {
      await page.evaluate(() => (document.documentElement.dir = "rtl"))
      await tick(page)
      const gap = await canvas(page).evaluate((root) => {
        const wire = root.querySelector<SVGPathElement>('path[data-slot="canvas-wire"]')!
        const start = wire.getPointAtLength(0)
        const at = new DOMPoint(start.x, start.y).matrixTransform(wire.getScreenCTM()!)
        const port = root.querySelector('[data-canvas-port="out"]')!.getBoundingClientRect()
        return Math.hypot(at.x - (port.left + port.width / 2), at.y - (port.top + port.height / 2))
      })
      expect(gap).toBeLessThan(1.5)
    })

    test("a selected node's edge clears 3:1 in every skin and theme", { tag: "@engine" }, async ({ page }) => {
      test.slow() // one page load per skin and theme
      for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
        for (const theme of ["light", "dark"]) {
          if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
          await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme as "light" | "dark" })
          await target.open(page, `?skin=${skin}&theme=${theme}`)
          await canvas(page).scrollIntoViewIfNeeded()
          await node(page, /^Reply/).focus()
          await page.keyboard.press("Space")
          const ratio = await canvas(page).evaluate((root) => {
            const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
            const rgb = (color: string) => {
              pen.clearRect(0, 0, 1, 1)
              pen.fillStyle = color
              pen.fillRect(0, 0, 1, 1)
              return [...pen.getImageData(0, 0, 1, 1).data].slice(0, 3)
            }
            const lum = (c: number[]) => {
              const [r, g, b] = c.map((v) => {
                const s = v / 255
                return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
              })
              return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
            }
            const card = root.querySelector('[aria-selected="true"] .canvas-node-card')!
            const [x, y] = [lum(rgb(getComputedStyle(card).borderTopColor)), lum(rgb(getComputedStyle(root).backgroundColor))].sort((m, n) => n - m)
            return (x! + 0.05) / (y! + 0.05)
          })
          expect(ratio, `${skin} ${theme}`).toBeGreaterThanOrEqual(3)
        }
      }
    })
  })
}

export { canvas, canvasTests, demo, node, tick }
