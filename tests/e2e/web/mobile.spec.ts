import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// The Mobile kit as web elements, on a page with no React: data in, events out.
const list = (page: Page) => page.getByRole("list", { name: "Messages" })
const row = (page: Page, name: string) => list(page).getByRole("listitem", { name: new RegExp(name) })
type Agent = {
  act: (x: unknown) => Promise<{ ok: boolean; error?: { message: string } }>
  query: (q: unknown) => Promise<{ label?: string; items?: { label: string }[] }[]>
}
const act = (page: Page, steps: unknown[]) =>
  page.evaluate((s) => (window as unknown as { agent: Agent }).agent.act({ steps: s }), steps)

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/mobile.html")
  await expect(row(page, "Grace Hopper")).toBeVisible()
})

for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
  for (const theme of ["light", "dark"] as const) {
    if (skin !== "base" && theme !== (skin === "ink" ? "light" : "dark")) continue // dark-only skins, and light-only Ink, look the same in both themes
    test(`the Mobile page passes axe in ${skin}, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.locator("uiset-root").evaluate((el, [s, t]) => (el.setAttribute("skin", s!), el.setAttribute("theme", t!)), [skin, theme])
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
    })
  }
}

test("rows from data: keys reach the actions, and focus goes to the row now in its place", async ({ page }) => {
  await row(page, "Ada Lovelace").focus()
  await page.keyboard.press("ArrowLeft")
  await expect(row(page, "Ada Lovelace").getByRole("button", { name: "Archive" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(row(page, "Ada Lovelace")).toHaveCount(0)
  await expect(row(page, "Linus Pauling")).toBeFocused()
  await page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo" }).click()
  await expect(row(page, "Ada Lovelace")).toBeVisible()
  // A row that only changed its text keeps its place; Read toggles the label.
  await row(page, "Grace Hopper").focus()
  await page.keyboard.press("ArrowRight")
  await page.keyboard.press("Enter")
  await expect(row(page, "^Grace Hopper")).toBeFocused()
  await expect(page.getByRole("button", { name: "Inbox, 1 new" })).toBeVisible()
})

test("a long swipe runs the side's first action; Enter opens a row", async ({ page }) => {
  const box = (await row(page, "Linus Pauling").boundingBox())!
  const [x, y] = [box.x + box.width - 20, box.y + box.height / 2]
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(x - 30 * i, y + (i % 2))
  await page.mouse.up()
  await expect(row(page, "Linus Pauling")).toHaveCount(0)
  await row(page, "Grace Hopper").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("Opened “Compiler notes for Friday”")).toBeVisible()
})

test("each row's actions menu is there for screen readers, named for its row", async ({ page }) => {
  const menu = row(page, "Ada Lovelace").getByRole("button", { name: "Actions for Unread, Ada Lovelace: The engine's second table" })
  await menu.focus()
  await expect(menu).toBeInViewport()
  await page.keyboard.press("Enter")
  // Keys and presses in the menu are the menu's: the row neither swipes nor opens.
  await page.keyboard.press("ArrowRight")
  await expect(row(page, "Ada Lovelace").locator('[data-side="start"]')).toHaveAttribute("inert", "")
  await page.getByRole("menuitem", { name: "Archive" }).click()
  await expect(row(page, "Ada Lovelace")).toHaveCount(0)
  await expect(page.getByText(/^Opened/)).toHaveCount(0)
})

test("agents run safe actions and open rows by name; Delete needs the person", async ({ page }) => {
  const archived = await act(page, [{ ref: "Messages", action: "run", args: ["Ada Lovelace", "Archive"] }])
  expect(archived.ok, archived.error?.message).toBe(true)
  await expect(row(page, "Ada Lovelace")).toHaveCount(0)
  const refused = await act(page, [{ ref: "Messages", action: "run", args: ["Linus", "Delete"] }])
  expect(refused.ok).toBe(false)
  expect(refused.error?.message).toContain('Needs a person: "Delete: Linus Pauling')
  const opened = await act(page, [{ ref: "Messages", action: "openRow", args: ["Grace Hopper"] }])
  expect(opened.ok, opened.error?.message).toBe(true)
  await expect(page.getByRole("region", { name: "Notifications" }).getByText("Opened “Compiler notes for Friday”")).toBeVisible()
  const items = await page.evaluate(async () => {
    const found = await (window as unknown as { agent: Agent }).agent.query({ within: "Messages" })
    return found.find((c) => c.label === "Messages")?.items?.map((i) => i.label)
  })
  expect(items).toContain("Linus Pauling: Lab booking moved (actions: Unread, Archive, Delete)")
})

test("pull down to refresh; the keyboard has a Refresh button; a failure is announced", async ({ page }) => {
  const box = (await page.locator("uiset-pull-refresh").boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 30)
  await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width / 2, box.y + 30 + i * 18)
  await expect(page.getByText("Release to refresh")).toBeVisible()
  await page.mouse.up()
  await expect(row(page, "Katherine Johnson")).toBeVisible()
  // A listener that rejects: the refresh says so and reports it.
  await page.locator("uiset-pull-refresh").evaluate((el) => {
    el.addEventListener("refresh", (e) => (e as CustomEvent<{ waitUntil: (p: Promise<unknown>) => void }>).detail.waitUntil(Promise.reject(new Error("offline"))))
    el.addEventListener("refresherror", (e) => ((window as unknown as { failed: string }).failed = String((e as CustomEvent<{ error: Error }>).detail.error.message)))
  })
  const refresh = page.getByRole("button", { name: "Refresh" })
  await refresh.focus()
  await expect(refresh).toBeInViewport()
  await page.keyboard.press("Enter")
  await expect.poll(() => page.evaluate(() => (window as unknown as { failed?: string }).failed)).toBe("offline")
  await expect(page.getByText("Couldn't refresh.")).toBeAttached()
  await expect(refresh).toBeEnabled()
})

test("the action sheet returns its choice; Delete all can be undone", async ({ page }) => {
  await page.getByRole("button", { name: "Inbox options" }).click()
  await page.getByRole("dialog", { name: "Inbox" }).getByRole("button", { name: "Mark all as read" }).click()
  await expect(page.getByRole("button", { name: "Inbox", exact: true })).toBeVisible()
  await expect(page.getByRole("dialog", { name: "Inbox" })).toBeHidden()
  await page.getByRole("button", { name: "Inbox options" }).click()
  await page.getByRole("dialog", { name: "Inbox" }).getByRole("button", { name: "Delete all" }).click()
  await expect(list(page).getByRole("listitem")).toHaveCount(0)
  await page.getByRole("region", { name: "Notifications" }).getByRole("button", { name: "Undo" }).click()
  await expect(row(page, "Grace Hopper")).toBeVisible()
})

test("the tab bar switches screens; wheels in a sheet set a time by keys and by agents", async ({ page }) => {
  await page.getByRole("button", { name: "Alarms" }).click()
  await expect(page.getByRole("button", { name: "Alarms" })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("heading", { name: "Alarms" })).toBeVisible()
  await page.getByRole("button", { name: "New alarm" }).click()
  const sheet = page.getByRole("dialog", { name: "New alarm" })
  const hour = sheet.getByRole("listbox", { name: "Alarm time, hour" })
  await hour.getByRole("option", { name: "7", exact: true }).focus()
  await page.keyboard.press("ArrowDown")
  await expect(hour.getByRole("option", { name: "8", exact: true })).toHaveAttribute("aria-selected", "true")
  await expect(sheet.getByRole("button", { name: "Save alarm for 8:30 AM" })).toBeVisible()
  // The value an agent sets stays, and focus in the wheel moves with it.
  const set = await act(page, [{ ref: "Alarm time, minute", action: "setValue", args: ["45"] }])
  expect(set.ok, set.error?.message).toBe(true)
  await expect(sheet.getByRole("button", { name: "Save alarm for 8:45 AM" })).toBeVisible()
  await sheet.getByRole("button", { name: "Save alarm for 8:45 AM" }).click()
  await expect(page.locator(".mobile-alarm-time", { hasText: "8:45 AM" })).toBeVisible()
})

test("v-model on a wheel: its value is the listbox's, and a turn fires input once it's in", async ({ page }) => {
  await page.getByRole("button", { name: "Alarms" }).click()
  await page.getByRole("button", { name: "New alarm" }).click()
  const sheet = page.getByRole("dialog", { name: "New alarm" })
  const hour = sheet.getByRole("listbox", { name: "Alarm time, hour" })
  await expect(hour.getByRole("option", { name: "7", exact: true })).toHaveAttribute("aria-selected", "true")
  await hour.locator("xpath=ancestor::uiset-wheel[1]").evaluate((wheel) => {
    const heard: unknown[] = []
    wheel.addEventListener("input", () => heard.push((wheel as HTMLElement & { value: unknown }).value))
    ;(window as unknown as { heard: unknown[] }).heard = heard
  })
  await hour.getByRole("option", { name: "7", exact: true }).focus()
  await page.keyboard.press("ArrowDown")
  await expect.poll(() => page.evaluate(() => (window as unknown as { heard: unknown[] }).heard)).toEqual(["8"])
  // State written in reaches the listbox, and fires nothing.
  await hour.locator("xpath=ancestor::uiset-wheel[1]").evaluate((wheel) => ((wheel as HTMLElement & { value: unknown }).value = "3"))
  await expect(hour.getByRole("option", { name: "3", exact: true })).toHaveAttribute("aria-selected", "true")
  expect(await page.evaluate(() => (window as unknown as { heard: unknown[] }).heard)).toEqual(["8"])
})

test("a value an agent sets on a wheel stays while the sheet is still opening", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.getByRole("button", { name: "Alarms" }).click()
  await page.getByRole("button", { name: "New alarm" }).click()
  const set = await act(page, [{ ref: "Alarm time, hour", action: "setValue", args: ["3"] }])
  expect(set.ok, set.error?.message).toBe(true)
  await page.waitForTimeout(1200)
  await expect(page.getByRole("dialog", { name: "New alarm" }).getByRole("button", { name: "Save alarm for 3:30 AM" })).toBeVisible()
})

test("a focused row shows its ring inside the row, in every skin", async ({ page }) => {
  for (const skin of ["base", "blueprint", "studio", "phosphor", "ink"]) {
    await page.locator("uiset-root").evaluate((el, s) => el.setAttribute("skin", s), skin)
    await row(page, "Grace Hopper").focus()
    await page.keyboard.press("ArrowDown")
    const ring = await row(page, "Ada Lovelace").evaluate((el) => {
      const cs = getComputedStyle(el)
      return { style: cs.outlineStyle, offset: cs.outlineOffset }
    })
    expect(ring).toEqual({ style: "solid", offset: "-2px" })
  }
})

test("an action from a row's menu hands focus to the row now in its place; the last row's to the one before", async ({ page }) => {
  await row(page, "Ada Lovelace").getByRole("button", { name: /Actions for/ }).focus()
  await page.keyboard.press("Enter")
  await page.getByRole("menuitem", { name: "Archive" }).click()
  await expect(row(page, "Linus Pauling")).toBeFocused()
  // The last row, by keyboard.
  await page.keyboard.press("ArrowLeft")
  await page.keyboard.press("Enter")
  await expect(row(page, "Linus Pauling")).toHaveCount(0)
  await expect(row(page, "Grace Hopper")).toBeFocused()
})

test("rows are kept by id: reordering and relabeling leave focus where it was", async ({ page }) => {
  await row(page, "Ada Lovelace").focus()
  await page.locator("uiset-swipe-list").evaluate((el) => {
    const list = el as unknown as { items: { label?: string }[] }
    list.items = [...list.items].reverse()
  })
  await expect(row(page, "Ada Lovelace")).toBeFocused()
  await page.keyboard.press("ArrowLeft")
  await expect(row(page, "Ada Lovelace").getByRole("button", { name: "Archive" })).toBeFocused()
  await page.locator("uiset-swipe-list").evaluate((el) => {
    const list = el as unknown as { items: { id: string; label?: string }[] }
    list.items = list.items.map((item) => (item.id === "m2" ? { ...item, label: "Ada Lovelace: Second table, relabeled" } : item))
  })
  await expect(row(page, "relabeled").getByRole("button", { name: "Archive" })).toBeFocused()
})

test("without openable, rows don't open, and agents are told so", async ({ page }) => {
  await page.locator("uiset-swipe-list").evaluate((el) => el.removeAttribute("openable"))
  await page.locator("uiset-swipe-list").evaluate((el) => {
    const list = el as unknown as { items: unknown[] }
    list.items = [...list.items]
  })
  await row(page, "Grace Hopper").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByText(/^Opened/)).toHaveCount(0)
  const opened = await act(page, [{ ref: "Messages", action: "openRow", args: ["Grace Hopper"] }])
  expect(opened.ok).toBe(false)
  expect(opened.error?.message).toContain("These rows don't open")
})

test("pull to refresh keeps its Refresh button focused while busy, takes words and threshold, and survives a framework's clear", async ({ page }) => {
  const refresh = page.locator("uiset-pull-refresh")
  const button = page.getByRole("button", { name: "Refresh" })
  await button.focus()
  await page.keyboard.press("Enter")
  await expect(button).toBeFocused()
  await expect(button).toHaveAttribute("aria-disabled", "true")
  await expect(row(page, "Katherine Johnson")).toBeVisible()
  await expect(button).toBeFocused()
  await refresh.evaluate((el) => {
    const r = el as unknown as { messages: object; threshold: number }
    r.messages = { refresh: "Actualizar" }
    r.threshold = 96
  })
  await expect(page.getByRole("button", { name: "Actualizar" })).toBeAttached()
  await expect(refresh).toHaveAttribute("threshold", "96")
  // A framework clears the children and puts its own back.
  await refresh.evaluate((el) => {
    const list = el.querySelector("uiset-swipe-list")!
    el.textContent = ""
    el.append(list)
  })
  await expect(refresh.locator(".mobile-refresh-indicator")).toHaveCount(1)
  await expect(page.getByRole("button", { name: "Actualizar" })).toBeAttached()
})

test("properties set before the elements are defined still apply", async ({ page }) => {
  await page.route("**/early-mobile.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<uiset-root><uiset-pull-refresh id="r"><uiset-swipe-list id="l" aria-label="Early"></uiset-swipe-list></uiset-pull-refresh></uiset-root>
        <script>
          document.getElementById("r").messages = { refresh: "Neu laden" }
          document.getElementById("l").items = [{ id: "a", label: "First", content: "First", end: [{ id: "x", label: "Archive" }] }]
        </script>
        <script type="module" src="/src/uiset.ts"></script>`,
    }),
  )
  await page.goto("/early-mobile.html")
  await expect(page.getByRole("listitem", { name: "First" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Neu laden" })).toBeAttached()
})
