import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const skins = ["Base", "Blueprint", "Studio", "Phosphor", "Ink"]
const themes = ["Light", "Dark"]

async function choose(page: Page, group: string, option: string) {
  await page
    .getByRole("radiogroup", { name: group })
    .getByRole("radio", { name: option })
    .click()
}

/** The site's skin, from the select beside the theme switch. */
async function chooseSkin(page: Page, skin: string) {
  await page.getByRole("combobox", { name: "Site skin", exact: true }).click()
  await page.getByRole("option", { name: skin, exact: true }).click()
}

for (const skin of skins) {
  for (const theme of themes) {
    test(`${skin} skin in ${theme.toLowerCase()} theme passes axe, contrast included`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.goto("/")
      await choose(page, "Skin", skin)
      await choose(page, "Theme", theme)
      const results = await new AxeBuilder({ page })
        .include(".stage-surface")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual(
        [],
      )
    })
  }
}

test("the whole page passes axe", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])
})

// UI SDK styles every <code> as inline code; inside <pre> its padding once pushed the first
// line of every code block (the site's and the chat kit's) 4px right of the rest.
for (const path of ["/agents", "/docs/kits/chat"]) {
  test(`code blocks on ${path} start every line at the same edge`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator("pre").first()).toBeVisible()
    const offsets = await page.locator("pre").evaluateAll((blocks) =>
      blocks
        .filter((pre) => (pre as HTMLElement).offsetParent)
        .map((pre) => {
          const cs = getComputedStyle(pre)
          const edge = pre.getBoundingClientRect().left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) - pre.scrollLeft
          const text = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT).nextNode()
          if (!text) return 0
          const range = document.createRange()
          range.setStart(text, 0)
          range.setEnd(text, 1)
          return Math.round(range.getBoundingClientRect().left - edge)
        }),
    )
    expect(offsets.length).toBeGreaterThan(0)
    expect(offsets.filter((x) => x !== 0)).toEqual([])
  })
}

// A copy button with a fuller aria-label once matched UI SDK's icon-only button rule and was
// squeezed to a square, its label spilling out. Every copy button shows its whole label.
for (const path of ["/", "/docs/components/select", "/docs/kits/chat"]) {
  test(`copy buttons on ${path} show their whole label`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator(".copy-button").first()).toBeVisible()
    const squeezed = await page
      .locator(".copy-button")
      .evaluateAll((buttons) => buttons.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.getAttribute("aria-label")))
    expect(squeezed).toEqual([])
  })
}

test("switching skins keeps every value and the focused control", async ({ page }) => {
  await page.goto("/")
  const volume = page.getByRole("slider", { name: "Volume" })
  await volume.focus()
  await page.keyboard.press("End")
  await expect(volume).toHaveValue("100")

  const nightMode = page.getByRole("switch", { name: "Night mode" })
  await nightMode.focus()
  await page.keyboard.press("Space")
  await expect(nightMode).toHaveAttribute("aria-checked", "true")

  await choose(page, "Skin", "Blueprint")
  await expect(page.locator(".stage-surface")).toHaveAttribute("data-skin", "blueprint")
  await expect(volume).toHaveValue("100")
  await expect(nightMode).toHaveAttribute("aria-checked", "true")
})

test("the specimen is reachable and operable with the keyboard alone", async ({
  page,
  browserName,
}) => {
  await page.goto("/")
  await page.getByRole("textbox", { name: "Device name" }).focus()
  // Safari's Tab skips buttons unless "Press Tab to highlight each item" is on; Option+Tab
  // reaches every control, as keyboard users there know.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab")
  await expect(page.getByRole("combobox", { name: "Output" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("listbox", { name: "Output" })).toBeVisible()
  await page.keyboard.press("End")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("combobox", { name: "Output" })).toHaveText(/Line out/)
  await expect(page.getByRole("combobox", { name: "Output" })).toBeFocused()

  await page.getByRole("button", { name: "Forget device" }).focus()
  await page.keyboard.press("Enter")
  await expect(
    page.getByRole("alertdialog", { name: "Forget Living room?" }),
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("alertdialog")).toBeHidden()
  await expect(page.getByRole("button", { name: "Forget device" })).toBeFocused()
})

test("checked state survives Windows high contrast (forced colors)", async ({ page, browserName }) => {
  // Forced colors is a Windows mode (Chrome, Edge, Firefox); Safari has none, and WebKit only
  // matches the media query under emulation without recoloring anything.
  test.skip(browserName === "webkit", "Safari has no forced-colors mode")
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
  await page.goto("/")
  for (const skin of skins) {
    await choose(page, "Skin", skin)
    const nightMode = page.getByRole("switch", { name: "Night mode" })
    await nightMode.click()
    const style = await nightMode.evaluate((el) => {
      const cs = getComputedStyle(el)
      return {
        border: cs.borderTopStyle,
        width: cs.borderTopWidth,
        bg: cs.backgroundColor,
      }
    })
    expect(style.border, `${skin}: switch has no border`).not.toBe("none")
    expect(style.width, `${skin}: switch border is zero`).not.toBe("0px")
    expect(style.bg, `${skin}: checked switch has no fill`).not.toBe("rgba(0, 0, 0, 0)")
    await nightMode.click()
  }
})

test("the switch thumb travels the other way in right-to-left", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  const thumbX = async () => {
    const box = await page
      .getByRole("switch", { name: "Night mode" })
      .locator('[data-slot="switch-thumb"]')
      .boundingBox()
    return box!.x
  }
  const nightMode = page.getByRole("switch", { name: "Night mode" })

  const ltrOff = await thumbX()
  await nightMode.click()
  expect(await thumbX()).toBeGreaterThan(ltrOff)
  await nightMode.click()

  await page.locator(".stage-surface").evaluate((el) => el.setAttribute("dir", "rtl"))
  const rtlOff = await thumbX()
  await nightMode.click()
  expect(await thumbX()).toBeLessThan(rtlOff)
})

// The layout audit (2026-11-19) found the Signal meter with no visible name, lying apart from
// the Output module like a stray scrollbar, and the agent's requests drawn as plain text.
test("the Studio rack's meter stands named beside its fader, and the agent's requests look pressable", async ({ page }) => {
  await page.goto("/docs/kits/studio")
  const output = page.locator(".rack-module").filter({ has: page.getByRole("heading", { name: "Output" }) })
  const meter = output.getByRole("meter", { name: "Signal" })
  const bar = (await meter.locator('[data-slot="meter-track"]').boundingBox())!
  const name = (await output.getByText("Signal", { exact: true }).boundingBox())!
  const module = (await output.boundingBox())!
  expect(bar.height).toBeGreaterThan(bar.width * 4)
  expect(bar.y + bar.height).toBeLessThanOrEqual(name.y)
  expect(Math.abs(bar.x + bar.width / 2 - (name.x + name.width / 2))).toBeLessThan(6)
  expect(bar.x + bar.width).toBeLessThanOrEqual(module.x + module.width)
  const request = page.getByRole("button", { name: "Start the beat" })
  const edge = await request.evaluate((el) => getComputedStyle(el).borderTopColor)
  expect(edge).not.toBe("rgba(0, 0, 0, 0)")
})

// The skins audit (2026-11-20): Studio's LED ladder squeezed green to red into the lit part,
// so a meter at 40% already showed red. The ladder spans the whole track.
test("Studio's meter lights the ladder's colours where they sit on the whole scale", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("uiset-site-skin", "studio"))
  await page.goto("/docs/components/meter")
  const track = page.locator('.example [data-slot="meter-track"]').first()
  const width = (await track.evaluate((el) => el.clientWidth))
  const ladder = await track.locator('[data-slot="meter-indicator"]').evaluate((el) => getComputedStyle(el).backgroundSize.split(",")[1]!.trim())
  expect(Math.abs(parseFloat(ladder) - width)).toBeLessThanOrEqual(1)
})

// The owner found the theme cards' forms under their tag and against the edges (2026-11-20), and
// a check in other skins found the page's skin leaking into them: on a Blueprint page the Ink
// card had Blueprint's uppercase labels and the Base card took the blue around it.
test("theme cards show each skin on its own, fitted below the tag, on a page in another skin", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("uiset-site-skin", "blueprint"))
  await page.goto("/themes")
  const card = (skin: string) => page.locator(`.lib-card-skin[data-skin="${skin}"]`)
  await expect(card("ink").locator("form")).toBeVisible()
  const style = (skin: string) =>
    card(skin).evaluate((el) => ({
      ground: getComputedStyle(el).backgroundColor,
      label: getComputedStyle(el.querySelector('[data-slot="field-label"]')!).textTransform,
    }))
  const [base, blueprint, ink] = [await style("base"), await style("blueprint"), await style("ink")]
  expect(blueprint.label).toBe("uppercase")
  expect(ink.label).toBe("none")
  expect(base.label).toBe("none")
  expect(base.ground).not.toBe(blueprint.ground)
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    const stage = page.locator(".lib-card-stage").filter({ has: card(skin) })
    const [box, form, tag] = [await stage.boundingBox(), await card(skin).locator("form").boundingBox(), await stage.locator(".lib-card-tag").boundingBox()]
    expect(form!.y, skin).toBeGreaterThanOrEqual(tag!.y + tag!.height)
    expect(form!.x, skin).toBeGreaterThan(box!.x + 8)
    expect(form!.x + form!.width, skin).toBeLessThan(box!.x + box!.width - 8)
    expect(form!.y + form!.height, skin).toBeLessThanOrEqual(box!.y + box!.height)
  }
})

// The Studio kit follows the page's skin like every other kit (it was once pinned to its own
// skin while the page showed Base), and its stage paints no Studio-only surface in other skins
// (it once left Blueprint, Phosphor and Ink text at about 1.1:1 on the page behind it).
test("the Studio rack and the whole site follow the skin picker", async ({ page }) => {
  await page.goto("/docs/kits/studio")
  const stage = page.locator(".studio-stage")
  await expect(stage).toHaveAttribute("data-skin", "base")
  await chooseSkin(page, "Ink")
  await expect(stage).toHaveAttribute("data-skin", "ink")
  await expect(page.locator(".site")).toHaveAttribute("data-skin", "ink")
  await chooseSkin(page, "Studio")
  await expect(stage).toHaveAttribute("data-skin", "studio")
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    test(`the Studio rack passes axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.goto(`/docs/kits/studio?skin=${skin}&theme=${theme}`)
      await expect(page.locator(".studio-stage")).toHaveAttribute("data-skin", skin)
      const results = await new AxeBuilder({ page })
        .include(".studio-stage")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])
    })
  }
}

// Links to a section of the same page land on it and stay (a Back-button handler once sent
// every in-page jump back to the top).
test("links to sections of the same page land on them and stay", async ({ page }) => {
  await page.goto("/docs/installation")
  const section = page.locator("#with-tailwind-css")
  await expect(page.locator("main h1").first()).toBeVisible()
  await page.getByRole("link", { name: "With Tailwind CSS", exact: true }).first().click()
  await expect(page).toHaveURL(/#with-tailwind-css$/)
  await expect(section).toBeInViewport()
  await page.waitForTimeout(400)
  await expect(section).toBeInViewport()
})

// The search palette fills its dialog, and its results start right under the field (the
// palette once kept its standalone width, and the empty message's padding left a gap). It
// stays where it opened as the results shrink: centered, it jumped with every key.
test("search fills its dialog, finds a page and goes to it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await page.getByRole("button", { name: "Search docs" }).click()
  const dialog = page.getByRole("dialog", { name: "Search the docs" })
  const field = dialog.getByRole("combobox", { name: "Search components, kits, templates and guides" })
  await expect(field).toBeFocused()
  const first = dialog.getByRole("option").first()
  await expect(first).toBeVisible()
  const [box, palette, input, option] = await Promise.all([
    dialog.boundingBox(),
    dialog.locator('[data-slot="command"]').boundingBox(),
    field.boundingBox(),
    first.boundingBox(),
  ])
  // Within the dialog's border.
  expect(palette!.width).toBeGreaterThanOrEqual(box!.width - 4)
  expect(input!.width).toBeGreaterThanOrEqual(box!.width - 4)
  expect(option!.y - (input!.y + input!.height)).toBeLessThan(12)
  await field.fill("data grid")
  await expect(dialog.getByRole("option").first()).toContainText("Data grid")
  await field.fill("zzzz")
  await expect(dialog.getByRole("status")).toContainText("Nothing matches")
  expect(Math.abs((await dialog.boundingBox())!.y - box!.y)).toBeLessThan(1)
  await field.fill("select")
  await expect(dialog.getByRole("option", { name: /^Select/ }).first()).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/docs\/components\/select$/)
  await expect(dialog).toBeHidden()
})

// After moving to another page its heading takes focus, so a screen reader announces it. A
// first load focuses nothing: React's development double effects once focused the heading,
// drawing a focus ring on every page as it opened.
test("the heading takes focus after moving to another page, not on first load", async ({ page }) => {
  // The page's own heading: the first in main (a kit demo may hold another).
  const heading = page.locator("main h1").first()
  await page.goto("/kits")
  await expect(heading).toBeVisible()
  await page.waitForTimeout(300)
  await expect(heading).not.toBeFocused()
  await page.getByRole("navigation", { name: "Library", exact: true }).getByRole("link", { name: /^Templates/ }).click()
  await expect(page).toHaveURL(/\/templates$/)
  await expect(heading).toHaveText(/templates/i)
  await expect(heading).toBeFocused()
})

test.describe("Studio", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/docs/kits/studio")
    await expect(page.locator(".studio-stage")).toBeVisible()
  })

  test("its page opens on the rack", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Studio" })).toBeInViewport()
    await expect(page.locator(".studio-stage")).toBeVisible()
  })

  test("the rack passes axe, contrast included", async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include(".studio-stage")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual(
      [],
    )
  })

  // The skins audit (2026-11-20): in Base the Signal meter's and Master fader's tracks were a
  // muted trough at 1.1:1, so the meter's empty part and the fader's travel didn't show; then a
  // check in every skin found Blueprint's meter at 1.3:1 and Studio's slots at 1.7:1. A track
  // shows by its fill, its border or a solid edge drawn as a shadow, whichever is strongest.
  for (const [skin, theme] of [["base", "light"], ["base", "dark"], ["blueprint", "dark"], ["studio", "dark"], ["phosphor", "dark"], ["ink", "light"]] as const) {
    test(`in ${skin} ${theme}, the meter's and fader's tracks hold 3:1 against the rack`, async ({ page }) => {
      await page.addInitScript((s) => localStorage.setItem("uiset-site-skin", s), skin)
      await page.goto(`/docs/kits/studio?theme=${theme}`)
      await expect(page.getByRole("meter", { name: "Signal" })).toBeVisible()
      const ratios = await page.evaluate(() => {
        const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
        const rgba = (color: string) => {
          ctx.clearRect(0, 0, 1, 1)
          ctx.fillStyle = color
          ctx.fillRect(0, 0, 1, 1)
          return [...ctx.getImageData(0, 0, 1, 1).data]
        }
        const luminance = (c: number[]) => {
          const [r, g, b] = c.slice(0, 3).map((v) => {
            const s = v / 255
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
          })
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
        }
        const ratio = (x: string, y: string) => {
          const [a, b] = [luminance(rgba(x)), luminance(rgba(y))]
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        }
        const behind = (el: Element) => {
          for (let e = el.parentElement; e; e = e.parentElement) {
            const bg = getComputedStyle(e).backgroundColor
            if (rgba(bg)[3]! > 0) return bg
          }
          return "white"
        }
        const tracks = document.querySelectorAll('.level-meter [data-slot="meter-track"], .fader-field [data-slot="slider-track"]')
        return [...tracks].map((track) => {
          const style = getComputedStyle(track)
          const bg = behind(track)
          const edges = style.boxShadow === "none" ? [] : style.boxShadow.split(/,(?![^(]*\))/).map((s) => /^\s*(\S+\(.*?\)|#\w+|\w+)/.exec(s)?.[1] ?? "transparent")
          const solid = [style.backgroundColor, ...edges].filter((c) => rgba(c)[3] === 255)
          if (parseFloat(style.borderTopWidth) > 0) solid.push(style.borderTopColor)
          return Math.max(0, ...solid.map((c) => ratio(c, bg)))
        })
      })
      expect(ratios.length).toBeGreaterThanOrEqual(2)
      for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(3)
    })
  }

  test("a knob steps with arrows, Page keys, Home and End", async ({ page }) => {
    const cutoff = page.getByRole("slider", { name: "Cutoff" })
    await cutoff.focus()
    await page.keyboard.press("Home")
    await expect(cutoff).toHaveAttribute("aria-valuetext", "80 Hz")
    await page.keyboard.press("ArrowUp")
    await expect(cutoff).toHaveAttribute("aria-valuenow", "81")
    await page.keyboard.press("End")
    await expect(cutoff).toHaveAttribute("aria-valuetext", "8.0 kHz")
  })

  test("dragging a knob up turns it up", async ({ page }) => {
    const depth = page.getByRole("slider", { name: "Depth" })
    await depth.scrollIntoViewIfNeeded()
    const before = Number(await depth.getAttribute("aria-valuenow"))
    const box = (await depth.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y - 40, { steps: 8 })
    await expect
      .poll(async () => Number(await depth.getAttribute("aria-valuenow")))
      .toBeGreaterThan(before)
    await expect(depth).toHaveAttribute("data-dragging", "")
    await page.mouse.up()
    await expect(depth).not.toHaveAttribute("data-dragging", "")
  })

  test("a cable patches with the keyboard alone", async ({ page }) => {
    await page.getByRole("button", { name: "Envelope out" }).focus()
    await page.keyboard.press("Enter")
    await page.keyboard.press("ArrowLeft")
    await page.keyboard.press("Enter")
    await expect(page.getByRole("button", { name: "Filter mod in" })).toHaveAttribute(
      "aria-description",
      "Patched to Envelope out",
    )
    await expect(page.locator(".patch-bay-cable:not([data-draft])")).toHaveCount(1)
  })

  test("a cable patches by dragging from an out jack to an in jack", async ({ page }) => {
    await page.locator(".rack-modules").scrollIntoViewIfNeeded()
    const from = (await page.getByRole("button", { name: "LFO out" }).boundingBox())!
    const to = (await page.getByRole("button", { name: "Amp mod in" }).boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
    await expect(page.getByRole("button", { name: "Amp mod in" })).toHaveAttribute(
      "data-connect",
      "target",
    )
    await page.mouse.up()
    await expect(page.getByRole("button", { name: "Amp mod in" })).toHaveAttribute(
      "aria-description",
      "Patched to LFO out",
    )
  })

  // Cables are drawn in the patch bay's own pixels. Inside something that scales it (a zoomed
  // canvas, a CSS transform), screen distances are no longer those pixels: a cable measured
  // from them missed its jacks, and a dragged one trailed away from the pointer.
  test("cables meet their jacks, and the pointer, inside a scaled container", async ({ page }) => {
    await page.addStyleTag({ content: ".studio-stage { transform: scale(0.7); transform-origin: 0 0; }" })
    // A new width makes the patch bay measure its jacks again, now that it is scaled.
    await page.setViewportSize({ width: 1100, height: 900 })
    await page.locator(".rack-modules").scrollIntoViewIfNeeded()
    await page.getByRole("button", { name: "Envelope out" }).focus()
    await page.keyboard.press("Enter")
    await page.keyboard.press("ArrowLeft")
    await page.keyboard.press("Enter")
    await expect(page.locator(".patch-bay-cable:not([data-draft])")).toHaveCount(1)

    /** Where a cable's two ends are on screen. */
    const ends = (selector: string) =>
      page.evaluate((sel) => {
        const path = document.querySelector<SVGPathElement>(`${sel} path`)!
        const bay = path.closest<HTMLElement>(".patch-bay")!
        const box = bay.getBoundingClientRect()
        const scale = box.width / bay.offsetWidth
        return [path.getPointAtLength(0), path.getPointAtLength(path.getTotalLength())].map((p) => ({ x: box.left + p.x * scale, y: box.top + p.y * scale }))
      }, selector)
    const centre = async (name: string) => {
      const box = (await page.getByRole("button", { name }).boundingBox())!
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }
    const far = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

    const jacks = [await centre("Envelope out"), await centre("Filter mod in")]
    for (const end of await ends(".patch-bay-cable:not([data-draft])")) expect(Math.min(...jacks.map((jack) => far(end, jack)))).toBeLessThan(2)

    // A cable being dragged: its loose end is under the pointer.
    const from = await centre("LFO out")
    const pointer = { x: from.x - 140, y: from.y + 60 }
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(pointer.x, pointer.y, { steps: 8 })
    await expect(page.locator(".patch-bay-cable[data-draft]")).toHaveCount(1)
    const loose = await ends(".patch-bay-cable[data-draft]")
    expect(Math.min(...loose.map((end) => far(end, pointer)))).toBeLessThan(3)
    await page.mouse.up()
  })

  test("the sequencer is one tab stop with arrow keys between steps", async ({
    page,
  }) => {
    const first = page.getByRole("button", { name: "Step 1", exact: true })
    await first.focus()
    await page.keyboard.press("ArrowRight")
    const second = page.getByRole("button", { name: "Step 2", exact: true })
    await expect(second).toBeFocused()
    await expect(second).toHaveAttribute("aria-pressed", "false")
    await page.keyboard.press("Space")
    await expect(second).toHaveAttribute("aria-pressed", "true")
  })

  test("an agent plays the rack: beat, filter, cable, pattern", async ({ page }) => {
    const section = page.locator(".item-stage")
    for (const prompt of [
      "Start the beat",
      "Make it darker",
      "Add a slow wobble to the filter",
      "Four on the floor",
    ]) {
      await section.getByRole("button", { name: prompt }).click()
    }
    await expect(section.locator(".agent-log span")).toHaveCount(4)
    await expect(section.locator(".agent-log span", { hasText: "✕" })).toHaveCount(0)
    await expect(page.getByRole("switch", { name: "Play" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(page.getByRole("slider", { name: "Cutoff" })).toHaveAttribute(
      "aria-valuetext",
      "260 Hz",
    )
    await expect(page.getByRole("button", { name: "Filter mod in" })).toHaveAttribute(
      "aria-description",
      "Patched to LFO out",
    )
    await expect(
      page.getByRole("button", { name: "Step 5", exact: true }),
    ).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("switch", { name: "Play" }).click()
  })
})

test.describe("Agent Console", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/agents#agents")
  })

  const console_ = (page: Page) =>
    page.getByRole("region", { name: "Agent", exact: true })
  const ask = async (page: Page, text: string) => {
    const box = console_(page).getByRole("textbox", { name: "Message" })
    await box.fill(text)
    await box.press("Enter")
  }

  test("passes axe, contrast included", async ({ page, browserName }) => {
    test.fixme(browserName === "firefox", "Playwright's Firefox crashes (signal 11) while automation inspects this page; normal use doesn't (HISTORY.md decision log, 2026-11-15)")
    await ask(page, "Turn on the weekly digest")
    await expect(page.getByRole("switch", { name: "Weekly digest" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    const results = await new AxeBuilder({ page })
      .include("#agents")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual(
      [],
    )
  })

  test("one sentence changes two settings, and Activity lists both", async ({ page }) => {
    const started = Date.now()
    await ask(page, "Make it public and move it to Europe")
    await expect(page.getByRole("combobox", { name: "Visibility" })).toHaveText(/Public/)
    await expect(page.getByRole("combobox", { name: "Region" })).toHaveText(/Europe/)
    expect(Date.now() - started, "two agent steps took too long").toBeLessThan(4000)
    await expect(
      console_(page).getByText("Done: 2 changes.", { exact: false }),
    ).toBeVisible()

    await console_(page).getByRole("tab", { name: "Activity" }).click()
    await expect(console_(page).getByText("2 changes by the agent")).toBeVisible()
    await expect(console_(page).getByText("Agent set Region to europe")).toBeVisible()
  })

  test("a destructive step waits for approval in the console, even over the agent's dialog", async ({
    page,
  }) => {
    await ask(page, "Delete the project")
    const card = console_(page).locator(".agent-approval")
    await expect(card).toContainText("Deletes the Apollo project")
    await expect(page.getByRole("alertdialog", { name: "Delete Apollo?" })).toBeVisible()
    await expect(console_(page)).toHaveAttribute("data-status", "waiting")
    await card.getByRole("button", { name: "Allow", exact: true }).click()
    await expect(page.getByText("The project was deleted.")).toBeVisible()
    await expect(card).toHaveCount(0)
  })

  test("Don't allow refuses the step and keeps the project", async ({ page }) => {
    await ask(page, "Delete the project")
    const card = console_(page).locator(".agent-approval")
    await card.getByRole("button", { name: /^Don.t allow$/ }).click()
    await expect(
      console_(page).locator('.agent-step[data-status="refused"]'),
    ).toHaveCount(1)
    await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
      "Apollo",
    )
    await expect(page.getByRole("alertdialog")).toBeHidden()
  })

  test("undo puts the agent's changes back and keeps the person's", async ({ page }) => {
    await ask(page, "Rename it to Atlas and turn off deploy on push")
    await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue("Atlas")
    await expect(page.getByRole("switch", { name: "Deploy on push" })).toHaveAttribute(
      "aria-checked",
      "false",
    )
    await page.getByRole("switch", { name: "Weekly digest" }).click()

    await console_(page).getByRole("tab", { name: "Activity" }).click()
    await console_(page).getByRole("button", { name: "Undo agent changes" }).click()
    await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue(
      "Apollo",
    )
    await expect(page.getByRole("switch", { name: "Deploy on push" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    await expect(page.getByRole("switch", { name: "Weekly digest" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
  })

  test("the prompt brings back earlier messages with ArrowUp", async ({ page }) => {
    await ask(page, "Turn on the weekly digest")
    await expect(console_(page).getByText(/Done: one change/)).toBeVisible()
    const box = console_(page).getByRole("textbox", { name: "Message" })
    await box.focus()
    await box.press("ArrowUp")
    await expect(box).toHaveValue("Turn on the weekly digest")
  })

  test("an agent can't see or press anything in the console", async ({ page }) => {
    const labels = await page.evaluate(() =>
      (window as unknown as { agent: { snapshot(): { label?: string }[] } }).agent
        .snapshot()
        .map((entry) => entry.label),
    )
    for (const label of ["Allow", "Undo agent changes", "Agent views", "What it sees"]) {
      expect(labels).not.toContain(label)
    }
    // The console's own message box is hidden from agents too.
    expect(labels).not.toContain("Message")
  })
})

test.describe("Chat kit", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/docs/kits/chat")
  })

  const chat = (page: Page) => page.locator(".item-frame")
  const box = (page: Page) => chat(page).getByRole("textbox", { name: "Message" })

  // The skins audit (2026-11-20): suggestion chips were pills in Phosphor, where every corner is square.
  test("suggestion chips are round in Base and square in Phosphor", async ({ page }) => {
    const chip = () => chat(page).locator('.chat-suggestions [data-slot="toolbar-button"]').first()
    await chat(page).getByRole("button", { name: "New chat" }).click()
    expect(parseFloat(await chip().evaluate((el) => getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThan(8)
    await page.evaluate(() => localStorage.setItem("uiset-site-skin", "phosphor"))
    await page.reload()
    await chat(page).getByRole("button", { name: "New chat" }).click()
    await expect(chip()).toHaveCSS("border-top-left-radius", "0px")
  })

  // A wheel at the end of a thread whose content ends between two pixels settled a pixel up and
  // let go of following, and nothing re-armed it, so the next answer arrived out of view
  // (2026-11-20; the same failure as shadcn-ui/ui#12766). Forced here: a short thread whose
  // content ends .6 past a whole pixel (the browser rounds the end up, then a wheel settles below).
  test("the thread keeps following after a wheel or End at its end", async ({ page }) => {
    await page.addStyleTag({ content: ".chat-thread-frame { max-height: 220px }" })
    const log = page.locator(".chat-thread-log").first()
    const height = await log.evaluate((el) => el.getBoundingClientRect().height)
    await page.addStyleTag({ content: `.chat-thread-log { padding-block-end: ${(1.6 - (height % 1)) % 1}px }` })
    const view = chat(page).locator(".chat-thread-scroller")
    await view.scrollIntoViewIfNeeded()
    await view.evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
    await expect(view).toHaveAttribute("data-sticking", "")
    const area = (await view.boundingBox())!
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2)
    await page.mouse.wheel(0, 300)
    await view.focus()
    await page.keyboard.press("End")
    await page.waitForTimeout(600)
    await expect(view).toHaveAttribute("data-sticking", "")
    await box(page).fill("Tell me more")
    await box(page).press("Enter")
    await expect(chat(page).locator(".chat-message[data-from=assistant]:not([data-streaming])")).toHaveCount(3, { timeout: 15000 })
    expect(await view.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeLessThanOrEqual(2)
  })

  for (const scheme of ["light", "dark"] as const) {
    test(`passes axe in ${scheme} mode, code colors included`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
      await chat(page)
        .locator(".chat-thread-scroller")
        .evaluate((el) => (el.scrollTop = 0))
      await expect(chat(page).locator(".chat-code-line").first()).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include(".item-frame")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual(
        [],
      )
    })
  }

  test("a message streams a reply with reasoning, a tool call and markdown", async ({
    page,
  }) => {
    await box(page).fill("How do I cancel a fetch?")
    await box(page).press("Enter")
    await expect(chat(page).getByRole("button", { name: "Stop" })).toBeVisible()
    const reply = chat(page).locator(".chat-message[data-from=assistant]").last()
    await expect(reply).toContainText("This is a simulated assistant", {
      timeout: 10_000,
    })
    await expect(reply.getByRole("button", { name: /Thought for/ })).toBeVisible()
    await expect(reply.getByRole("button", { name: /Searched the docs/ })).toContainText(
      "Done",
    )
    // The reply keeps streaming after the tool call; Send comes back when it ends.
    await expect(chat(page).getByRole("button", { name: "Send" })).toBeVisible({ timeout: 10_000 })
    await expect(box(page)).toHaveValue("")
  })

  test("a slash command is chosen with the keyboard, then Enter sends", async ({
    page,
  }) => {
    await box(page).click()
    await page.keyboard.type("/ex")
    await expect(page.getByRole("option", { name: /explain/ })).toBeVisible()
    await page.keyboard.press("Enter")
    await expect(box(page)).toHaveValue("/explain ")
    await page.keyboard.type("the hook")
    await page.keyboard.press("Enter")
    await expect(
      chat(page).locator(".chat-message[data-from=user]").last(),
    ).toContainText("/explain the hook")
  })

  test("a file attaches, shows as a chip, and can be removed", async ({ page }) => {
    await chat(page)
      .locator('input[type="file"]')
      .setInputFiles({
        name: "notes.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("hi"),
      })
    await expect(chat(page).getByText("notes.txt")).toBeVisible()
    await chat(page).getByRole("button", { name: "Remove notes.txt" }).click()
    await expect(chat(page).getByText("notes.txt")).toHaveCount(0)
  })

  test("a new chat starts empty with suggestions, and chats can be renamed", async ({
    page,
  }) => {
    await chat(page).getByRole("button", { name: "New chat" }).click()
    await expect(chat(page).getByText("What are we working on?")).toBeVisible()
    await chat(page).getByRole("button", { name: "More for Launch checklist" }).click()
    await page.getByRole("menuitem", { name: "Rename" }).click()
    const field = chat(page).getByRole("textbox", { name: "Rename Launch checklist" })
    await field.fill("Launch plan v2")
    await field.press("Enter")
    await expect(
      chat(page).getByRole("button", { name: "Open Launch plan v2", exact: true }),
    ).toBeVisible()
  })

  test("the model picker and usage meter are named for everyone", async ({ page }) => {
    await expect(chat(page).getByRole("combobox", { name: "Model" })).toHaveText(
      /Balanced/,
    )
    await expect(chat(page).getByRole("meter", { name: "Context used" })).toHaveAttribute(
      "aria-valuetext",
      /of 200K tokens/,
    )
  })
})
