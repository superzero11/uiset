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
for (const path of ["/agents", "/kits#chat"]) {
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
for (const path of ["/", "/docs/components/select", "/kits"]) {
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

// The Studio kit follows the page's skin like every other kit (it was once pinned to its own
// skin while the page showed Base), and its stage paints no Studio-only surface in other skins
// (it once left Blueprint, Phosphor and Ink text at about 1.1:1 on the page behind it).
test("the Studio rack follows the skin picker, and links to its own skin", async ({ page }) => {
  await page.goto("/kits")
  const stage = page.locator(".studio-stage")
  await expect(stage).toHaveAttribute("data-skin", "base")
  await choose(page, "Skin", "Ink")
  await expect(stage).toHaveAttribute("data-skin", "ink")
  await page.getByRole("link", { name: "See it in the Studio skin" }).click()
  await expect(stage).toHaveAttribute("data-skin", "studio")
  await expect(page.getByRole("radiogroup", { name: "Skin" }).getByRole("radio", { name: "Studio" })).toHaveAttribute("aria-checked", "true")
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    test(`the Studio rack passes axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.goto(`/kits?skin=${skin}&theme=${theme}#studio`)
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
  const heading = (id: string) => page.locator(`#${id} h2`).first()
  await page.goto("/kits#scheduler")
  await expect(heading("scheduler")).toBeInViewport()
  const index = page.getByRole("navigation", { name: "Kits on this page" })
  for (const [name, id] of [["Charts", "charts"], ["Studio", "studio"], ["Chat", "chat"]] as const) {
    await index.getByRole("link", { name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`#${id}$`))
    await expect(heading(id)).toBeInViewport()
    await page.waitForTimeout(400)
    await expect(heading(id)).toBeInViewport()
  }
  await page.goBack()
  await expect(page).toHaveURL(/#studio$/)
  await expect(heading("studio")).toBeInViewport()
})

// The search palette fills its dialog, and its results start right under the field (the
// palette once kept its standalone width, and the empty message's padding left a gap).
test("search fills its dialog, finds a page and goes to it", async ({ page }) => {
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
  await page.getByRole("navigation", { name: "Site", exact: true }).getByRole("link", { name: "Templates" }).click()
  await expect(page).toHaveURL(/\/templates$/)
  await expect(heading).toHaveText(/template/i)
  await expect(heading).toBeFocused()
})

test.describe("Studio", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/kits#studio")
    await expect(page.locator(".studio-stage")).toBeVisible()
  })

  test("a #studio link lands on the Studio section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Studio: a synth rack, with sound" }),
    ).toBeInViewport()
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
    const section = page.locator("#studio")
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
    await page.goto("/kits#chat")
  })

  const chat = (page: Page) => page.locator("#chat")
  const box = (page: Page) => chat(page).getByRole("textbox", { name: "Message" })

  for (const scheme of ["light", "dark"] as const) {
    test(`passes axe in ${scheme} mode, code colors included`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
      await chat(page)
        .locator(".chat-thread-scroller")
        .evaluate((el) => (el.scrollTop = 0))
      await expect(chat(page).locator(".chat-code-line").first()).toBeVisible()
      const results = await new AxeBuilder({ page })
        .include("#chat")
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
