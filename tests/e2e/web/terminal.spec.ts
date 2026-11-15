import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// The Terminal as a web element, on a page with no React: the gallery's commands, on the
// same screen and session as the React Terminal.

const term = (page: Page) => page.getByRole("group", { name: "Shell", exact: true })
const input = (page: Page) => term(page).getByRole("textbox", { name: /Command/ })
const output = (page: Page) => term(page).getByRole("log", { name: "Shell output" })
const run = async (page: Page, line: string) => {
  await input(page).fill(line)
  await input(page).press("Enter")
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/terminal.html")
  await expect(input(page)).toBeVisible()
})

const skinned = async (page: Page, skin: string, theme: string) => {
  await page.goto("/terminal.html")
  await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
}

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Terminal page passes axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await skinned(page, skin, theme)
      await run(page, "colors")
      await run(page, "cat README.md")
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("run commands; output keeps its colors and links; errors read in the danger tone", async ({ page }) => {
  await run(page, "cat README.md")
  await expect(output(page).getByRole("link", { name: "https://example.com/greeter" })).toBeVisible()
  await run(page, "colors")
  await expect(output(page).locator('[data-fg="red"]').first()).toHaveText("red")
  await run(page, "cat nope")
  await expect(output(page).locator('[data-fg="red"]').last()).toHaveText("cat: nope: no such file")
  await run(page, "frobnicate")
  await expect(output(page)).toContainText("frobnicate: command not found. Type help for the list.")
})

test("Up brings back earlier commands; history lists them", async ({ page }) => {
  await run(page, "echo one")
  await run(page, "echo two")
  await input(page).press("ArrowUp")
  await expect(input(page)).toHaveValue("echo two")
  await input(page).press("ArrowUp")
  await expect(input(page)).toHaveValue("echo one")
  await input(page).press("ArrowDown")
  await input(page).press("ArrowDown")
  await expect(input(page)).toHaveValue("")
  await run(page, "history")
  await expect(output(page)).toContainText("2  echo one")
})

test("Tab completes a command or a file, lists several, and leaves an empty prompt alone", async ({ page }) => {
  await input(page).fill("ec")
  await input(page).press("Tab")
  await expect(input(page)).toHaveValue("echo ")
  await input(page).fill("cat ")
  // Several matches list on the second Tab, as shells do.
  await input(page).press("Tab")
  await expect(output(page)).not.toContainText("README.md   notes.txt")
  await input(page).press("Tab")
  await expect(output(page)).toContainText("README.md   notes.txt   package.json")
  await input(page).fill("cat n")
  await input(page).press("Tab")
  await expect(input(page)).toHaveValue("cat notes.txt ")
  await input(page).fill("")
  await input(page).press("Tab")
  await expect(input(page)).not.toBeFocused()
})

test("a streamed command redraws its progress line; Ctrl+C stops a long one", async ({ page }) => {
  await run(page, "build")
  await expect(output(page)).toContainText("✓ Built in 0.6s")
  await expect(output(page).getByText("Building greeter…")).toHaveCount(1)
  await expect(output(page).getByText(/% *$/)).toHaveCount(1)
  await run(page, "ping example.com")
  await expect(output(page)).toContainText("seq=2")
  await expect(term(page)).toHaveAttribute("data-running", "")
  await input(page).press("Control+c")
  await expect(term(page)).not.toHaveAttribute("data-running", "")
  await expect(output(page)).toContainText("^C")
  const count = await output(page).locator(".terminal-line").count()
  await page.waitForTimeout(900)
  expect(await output(page).locator(".terminal-line").count()).toBe(count)
})

test("Ctrl+L clears the screen", async ({ page }) => {
  await run(page, "ls")
  await input(page).press("Control+l")
  await expect(output(page).locator(".terminal-line")).toHaveCount(0)
})

test("agents run commands and read the output", async ({ page }) => {
  type Act = { ok: boolean; error?: { message: string } }
  const act = (steps: unknown[]) =>
    page.evaluate((s) => (window as unknown as { agent: { act: (x: unknown) => Promise<Act> } }).agent.act({ steps: s }), steps)
  const result = await act([{ ref: "Shell", action: "run", args: ["echo from an agent"] }])
  expect(result.ok, result.error?.message).toBe(true)
  await expect(output(page)).toContainText("from an agent")
  const items = await page.evaluate(async () => {
    const found = await (window as unknown as { agent: { query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]> } }).agent.query({ within: "Shell" })
    return found.find((c) => c.label === "Shell")?.items?.map((i) => i.label)
  })
  expect(items).toEqual(expect.arrayContaining(["~/greeter $ echo from an agent", "from an agent"]))
})

test("every ANSI color clears 4.5:1 on the terminal in every skin and theme", async ({ page }) => {
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    for (const theme of ["light", "dark"]) {
      if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme as "light" | "dark" })
      await skinned(page, skin, theme)
      await run(page, "colors")
      // Output reaches the page on the next frame.
      await expect(output(page).locator("[data-fg]").first()).toBeVisible()
      const worst = await term(page).evaluate((root) => {
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
        const surface = lum(rgb(getComputedStyle(root).backgroundColor))
        // Inverse text sits on its own solid background; the badges test measures it there.
        const ratios = [...root.querySelectorAll<HTMLElement>("[data-fg]:not([data-inverse])")].map((el) => {
          const l = lum(rgb(getComputedStyle(el).color))
          return { name: el.dataset.fg, ratio: (Math.max(l, surface) + 0.05) / (Math.min(l, surface) + 0.05) }
        })
        return ratios.sort((a, b) => a.ratio - b.ratio)[0]
      })
      expect(worst!.ratio, `${skin} ${theme} ${worst!.name}`).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test.describe("review fixes", () => {
  test("a spinner that erases and rewrites its line leaves one line", async ({ page }) => {
    await run(page, "install")
    await expect(output(page)).toContainText("✓ Installed 5 packages")
    await expect(output(page).locator('.terminal-line[data-kind="out"]', { hasText: /Install/ })).toHaveCount(1)
  })

  test("Ctrl+C gives the prompt back at once, even from a command that ignores it", async ({ page }) => {
    await run(page, "sleep 5")
    await expect(term(page)).toHaveAttribute("data-running", "")
    await input(page).press("Control+c")
    await expect(term(page)).not.toHaveAttribute("data-running", "", { timeout: 1000 })
    await run(page, "echo back")
    await expect(output(page)).toContainText("back")
  })

  test("names on Object's prototype aren't commands", async ({ page }) => {
    await run(page, "toString")
    await expect(output(page)).toContainText("toString: command not found")
  })

  test("agents can't fake the echoed line with control characters", async ({ page }) => {
    const result = await page.evaluate(() =>
      (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }> } }).agent.act({
        steps: [{ ref: "Shell", action: "run", args: ["echo rm -rf /tmp/x\rls"] }],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.error?.message).toMatch(/one line of plain text/)
  })

  test("the log announces new lines, not redraws; the prompt is named Command", async ({ page }) => {
    await expect(output(page)).toHaveAttribute("aria-relevant", "additions")
    await expect(input(page)).toHaveAccessibleName("Command")
    await input(page).fill("cat ")
    await input(page).press("Tab")
    await input(page).press("Tab")
    await expect(output(page).locator(".terminal-line").last()).toHaveAttribute("aria-hidden", "true")
  })

  test("in a narrow terminal the prompt keeps room to type while a command runs", async ({ page }) => {
    await term(page).evaluate((el) => (el.style.inlineSize = "300px"))
    await run(page, "sleep 2")
    const width = await input(page).evaluate((el) => el.getBoundingClientRect().width)
    expect(width).toBeGreaterThan(60)
  })

  test("New output below brings you to the end and puts you back in the prompt", async ({ page }) => {
    await run(page, "help")
    await run(page, "help")
    await run(page, "ping here")
    await output(page).evaluate((el) => (el.scrollTop = 0))
    const jump = term(page).getByRole("button", { name: "New output below" })
    await expect(jump).toBeVisible()
    await jump.click()
    await expect(input(page)).toBeFocused()
    await input(page).press("Control+c")
  })

  test("badges, dim and grey text keep 4.5:1 on their own backgrounds in every skin and theme", async ({ page }) => {
    for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
      for (const theme of ["light", "dark"]) {
        if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
        await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme as "light" | "dark" })
        await skinned(page, skin, theme)
        await run(page, "colors")
        await expect(output(page).locator("[data-inverse]").first()).toBeVisible()
        // A badge is a solid fill, not colored text.
        expect(await output(page).locator("[data-inverse]").first().evaluate((el) => getComputedStyle(el).backgroundColor)).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
        const worst = await term(page).evaluate((root) => {
          const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
          const rgba = (color: string) => {
            pen.clearRect(0, 0, 1, 1)
            pen.fillStyle = color
            pen.fillRect(0, 0, 1, 1)
            const d = pen.getImageData(0, 0, 1, 1).data
            return [d[0]!, d[1]!, d[2]!, d[3]! / 255]
          }
          const lum = (c: number[]) =>
            c.slice(0, 3).map((v) => {
              const s = v / 255
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0)
          const surface = rgba(getComputedStyle(root).backgroundColor)
          const spans = [...root.querySelectorAll<HTMLElement>(".terminal-line [data-fg], .terminal-line [data-inverse], .terminal-line [data-dim]")]
          return spans
            .map((el) => {
              const own = rgba(getComputedStyle(el).backgroundColor)
              const ground = surface.slice(0, 3).map((c, i) => c * (1 - own[3]!) + own[i]! * own[3]!)
              const [x, y] = [lum(rgba(getComputedStyle(el).color)), lum(ground)].sort((m, n) => n - m)
              return { text: el.textContent, ratio: (x! + 0.05) / (y! + 0.05) }
            })
            .sort((a, b) => a.ratio - b.ratio)[0]!
        })
        expect(worst.ratio, `${skin} ${theme} "${worst.text}"`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

test("properties set before the element is defined are picked up", async ({ page }) => {
  await page.route("**/early-terminal.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root><uiset-terminal id="t" label="Early shell"></uiset-terminal></uiset-root>
        <script>
          const t = document.getElementById("t")
          t.commands = { hello: { description: "Says hello", run: () => "hello early" } }
          t.history = ["hello"]
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-terminal.html")
  const shell = page.getByRole("group", { name: "Early shell", exact: true })
  const field = shell.getByRole("textbox", { name: /Command/ })
  await field.press("ArrowUp")
  await expect(field).toHaveValue("hello")
  await field.press("Enter")
  await expect(shell.getByRole("log")).toContainText("hello early")
})

test("the page's welcome and history show; a click on the output focuses the prompt; old lines stay as they were", async ({ page }) => {
  await expect(output(page)).toContainText("Welcome. Type help for the commands")
  // The page gave `history` after the element started: Up still brings it back.
  await input(page).press("ArrowUp")
  await expect(input(page)).toHaveValue("ls")
  await input(page).fill("")
  const first = output(page).locator(".terminal-line").first()
  await first.evaluate((el) => ((window as unknown as { kept: Element }).kept = el))
  await run(page, "echo hi")
  await expect(output(page)).toContainText("hi")
  expect(await first.evaluate((el) => el === (window as unknown as { kept: Element }).kept)).toBe(true)
  await page.getByRole("heading", { name: "Terminal" }).click()
  await output(page).click({ position: { x: 40, y: 8 } })
  await expect(input(page)).toBeFocused()
})

test("agents wait while a command runs; Ctrl+C lets them in", async ({ page }) => {
  await run(page, "ping example.com")
  await expect(output(page)).toContainText("reply from example.com")
  const busy = await page.evaluate(() => (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }> } }).agent.act({ steps: [{ ref: "Shell", action: "run", args: ["ls"] }] }))
  expect(busy.ok).toBe(false)
  expect(busy.error?.message).toContain("still running")
  await input(page).press("Control+c")
  const ok = await page.evaluate(() => (window as unknown as { agent: { act: (x: unknown) => Promise<{ ok: boolean }> } }).agent.act({ steps: [{ ref: "Shell", action: "run", args: ["ls"] }] }))
  expect(ok.ok).toBe(true)
})
