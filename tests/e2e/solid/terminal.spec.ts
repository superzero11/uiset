import { expect, test, type Page } from "@playwright/test"
import { input, output, run, term, terminalTests } from "../terminal-tests"

// The terminal kit on Solid's page (solid/terminal.html), with React's browser tests
// (terminal-tests.ts): the same history, Tab, streaming, Ctrl+C, Ctrl+L and colors in every skin.

terminalTests({ open: (page, search = "") => page.goto(`/terminal.html${search}`).then(() => undefined) })

function watch(page: Page) {
  const said: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") said.push(`${message.type()}: ${message.text()}`)
  })
  page.on("pageerror", (error) => said.push(`pageerror: ${error.message}`))
  return said
}

test("the terminal page, rendered on the server, hydrates with no errors or warnings, and works", async ({ page }) => {
  const problems = watch(page)
  const response = await page.goto("/ssr/terminal")
  const html = await response!.text()
  expect(html).toContain('aria-roledescription="terminal"')
  expect(html).toContain("Welcome. Type help for the commands")
  await run(page, "echo hydrated")
  await expect(output(page)).toContainText("~/greeter $ echo hydrated")
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

test("streaming, Tab, history, Ctrl+C and Ctrl+L say nothing on the console", async ({ page }) => {
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/terminal.html")
  await run(page, "install")
  await expect(output(page)).toContainText("✓ Installed 5 packages")
  await input(page).fill("cat ")
  await input(page).press("Tab")
  await input(page).press("Tab")
  await input(page).fill("")
  await input(page).press("ArrowUp")
  await expect(input(page)).toHaveValue("install")
  await input(page).fill("")
  await run(page, "ping here")
  await expect(output(page)).toContainText("seq=2")
  await input(page).press("Control+c")
  await expect(term(page)).not.toHaveAttribute("data-running", "")
  await input(page).press("Control+l")
  await expect(output(page).locator(".terminal-line")).toHaveCount(0)
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
})

// A terminal's controls are its commands and keys: the sweep runs every command `help` lists
// (each to its end, or stopped), the keys, New output below, and the page's own switches.
test("every command, key and control on the Solid terminal page works with no error or warning", async ({ page }) => {
  test.setTimeout(120_000)
  const problems = watch(page)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/terminal.html")
  await run(page, "help")
  // Each line of help starts with its command in bold, then its arguments.
  const listed = await output(page).evaluate((log) =>
    [...log.querySelectorAll(".terminal-line > [data-bold]:first-child")].map((head) => (head.textContent ?? "").split(" ")[0]!).filter(Boolean),
  )
  const commands = [...new Set([...listed, "help", "history", "clear"])]
  expect(commands.length, `help listed: ${listed.join(", ")}`).toBeGreaterThanOrEqual(10)
  let pressed = 0
  const args: Record<string, string> = { cat: "notes.txt", echo: "swept", sleep: "1", ping: "here" }
  for (const name of commands) {
    await run(page, [name, args[name]].filter(Boolean).join(" "))
    // A command still running after a moment is stopped, as a person would.
    await page.waitForTimeout(400)
    if ((await term(page).getAttribute("data-running")) !== null) await input(page).press("Control+c")
    await expect(term(page)).not.toHaveAttribute("data-running", "")
    pressed++
    expect(problems, `after ${name}`).toEqual([])
  }
  // The keys: history both ways, Tab with one match and with several, Ctrl+C on typed text, Ctrl+L.
  for (const keys of [["ArrowUp"], ["ArrowDown"], ["Control+c"], ["Control+l"]]) {
    await input(page).fill(keys[0] === "Control+c" ? "half typed" : "")
    for (const key of keys) await input(page).press(key)
    pressed++
  }
  for (const typed of ["ec", "cat ", "cat n"]) {
    await input(page).fill(typed)
    await input(page).press("Tab")
    await input(page).press("Tab")
    pressed++
  }
  await input(page).fill("")
  // New output below: output arriving while you read above.
  await run(page, "help")
  await run(page, "help")
  await run(page, "ping here")
  await expect(output(page)).toContainText("seq=1")
  await output(page).evaluate((el) => (el.scrollTop = 0))
  await term(page).getByRole("button", { name: "New output below" }).click()
  await expect(input(page)).toBeFocused()
  await input(page).press("Control+c")
  pressed++
  // The output's link opens in a new tab (answered here, not by the real site).
  await page.context().route("https://example.com/**", (route) => route.fulfill({ body: "Greeter docs" }))
  await run(page, "cat README.md")
  const [popup] = await Promise.all([page.waitForEvent("popup"), output(page).getByRole("link", { name: "https://example.com/greeter" }).last().click()])
  await popup.close()
  pressed++
  for (const look of ["Blueprint", "Studio", "Phosphor", "Ink", "Base", "Dark", "Light", "System"]) {
    await page.getByRole("radio", { name: look, exact: true }).click()
    pressed++
  }
  await page.waitForTimeout(300)
  expect(problems).toEqual([])
  // 28 on 2026-11-25: a sweep that finds far fewer has stopped finding the commands.
  expect(pressed).toBeGreaterThanOrEqual(25)
})
