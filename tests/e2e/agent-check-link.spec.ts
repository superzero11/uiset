import { once } from "node:events"
import { createServer, type IncomingMessage } from "node:http"
import type { AddressInfo } from "node:net"
import AxeBuilder from "./axe"
import { expect, test, type Page } from "@playwright/test"
import { checkUrl } from "@/api/_agent-check/run"
import { formatAgentReadiness } from "@/registry/uiset/ui/agent-check/check"
import { captureAgentTools, checkPage } from "@/registry/uiset/ui/agent-check/playwright"

// The paste-a-link checker (uiset.dev/check): the check it runs in its own browser, and the page.

test.describe("the checker's browser", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "It launches its own Chrome, whatever browser the suite runs in")
  test.setTimeout(90_000)

  // A page on 127.0.0.1 that reaches for "localhost" with a script, a fetch and a WebSocket. The
  // checker loads pages on this machine only when a test allows it; once the page is served,
  // this test can take that back, as if the page were public and localhost private.
  async function site(onPage: () => void) {
    const seen: string[] = []
    const record = (request: IncomingMessage) => seen.push(`${request.headers.host?.split(":")[0]} ${request.headers.upgrade ?? ""}${request.url}`)
    const server = createServer((request, response) => {
      record(request)
      if (request.url === "/leak.js") return response.end('document.title = "Loaded"')
      if (request.url === "/hop") {
        // A redirect from the page that's allowed to one that isn't.
        delete process.env.AGENT_CHECK_ALLOW_PRIVATE
        response.writeHead(302, { location: `http://localhost:${(server.address() as AddressInfo).port}/` })
        return response.end()
      }
      if (request.url !== "/") return response.end("{}")
      onPage()
      const { port } = server.address() as AddressInfo
      response.setHeader("content-type", "text/html")
      response.end(`<!doctype html><title>Safe</title><main><button type="button"></button>
        <script src="http://localhost:${port}/leak.js"></script>
        <script>fetch("http://localhost:${port}/data", { mode: "no-cors" }).catch(() => {}); try { new WebSocket("ws://localhost:${port}/socket") } catch {}</script></main>`)
    })
    server.on("upgrade", (request, socket) => {
      record(request)
      socket.destroy()
    })
    server.listen(0, "127.0.0.1")
    await once(server, "listening")
    return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`, seen, close: () => server.close() }
  }

  test.afterEach(() => {
    delete process.env.AGENT_CHECK_ALLOW_PRIVATE
  })

  test("reads a page and reports what it finds", async () => {
    process.env.AGENT_CHECK_ALLOW_PRIVATE = "1"
    const page = await site(() => {})
    try {
      const checked = await checkUrl(page.url)
      // Everything loaded while it was allowed: the script ran, and the fetch and WebSocket went out.
      expect(checked.title).toBe("Loaded")
      await expect.poll(() => page.seen.filter((line) => line.startsWith("localhost")).sort()).toEqual(["localhost /data", "localhost /leak.js", "localhost websocket/socket"])
      expect(checked.report.mode).toBe("page")
      expect(checked.report.problems).toEqual([expect.objectContaining({ kind: "unnamed" })])
    } finally {
      page.close()
    }
  })

  test("every connection the page makes goes through the address check: scripts, fetches and WebSockets", async () => {
    process.env.AGENT_CHECK_ALLOW_PRIVATE = "1"
    const page = await site(() => delete process.env.AGENT_CHECK_ALLOW_PRIVATE)
    try {
      const checked = await checkUrl(page.url)
      expect(checked.title).toBe("Safe")
      expect(page.seen.filter((line) => line.startsWith("localhost"))).toEqual([])
    } finally {
      page.close()
    }
  })

  test("a redirect to a private address goes no further, and the report says why", async () => {
    process.env.AGENT_CHECK_ALLOW_PRIVATE = "1"
    const page = await site(() => {})
    try {
      await expect(checkUrl(`${page.url}hop`)).rejects.toThrow(/^127\.0\.0\.1:\d+ leads to an address on a private network/)
      expect(page.seen.filter((line) => line.startsWith("localhost"))).toEqual([])
    } finally {
      page.close()
    }
  })

  test("refuses private addresses before it starts a browser", async () => {
    await expect(checkUrl("http://127.0.0.1/")).rejects.toThrow("private network")
    await expect(checkUrl("http://[::ffff:7f00:1]/")).rejects.toThrow("private network")
  })
})

test.describe("the /check page", () => {
  const report = {
    url: "https://example.com/",
    finalUrl: "https://example.com/",
    title: "Example Domain",
    report: {
      mode: "page",
      score: 80,
      controls: 5,
      ready: 4,
      problems: [{ kind: "unnamed", severity: "error", control: "button", near: "main", message: 'button (in "main") has no name.' }],
    },
  }

  async function answer(page: Page, body: object, status = 200) {
    const asked: string[] = []
    await page.route("**/api/agent-check?*", async (route) => {
      asked.push(new URL(route.request().url()).searchParams.get("url")!)
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
    })
    return asked
  }

  test("checks the address entered, shows the report and puts the address in the page's", async ({ page }) => {
    const asked = await answer(page, report)
    await page.goto("/check")
    await page.getByRole("textbox", { name: "Page address" }).fill("example.com")
    await page.getByRole("button", { name: "Check" }).click()
    const result = page.getByRole("region", { name: "Report" })
    await expect(result.getByRole("heading", { name: "Example Domain" })).toBeVisible()
    await expect(result.getByRole("link", { name: "https://example.com/" })).toBeVisible()
    await expect(result).toContainText("read from its accessibility tree")
    await expect(result.locator(".readiness-number")).toHaveText("80")
    await expect(result.locator(".readiness-problems li")).toHaveCount(1)
    expect(asked).toEqual(["example.com"])
    expect(new URL(page.url()).searchParams.get("url")).toBe("example.com")
    await expect(result.getByRole("button", { name: "Copy a link to this report" })).toBeVisible()
  })

  test("a shared link checks its page as it opens", async ({ page }) => {
    const asked = await answer(page, report)
    await page.goto("/check?url=example.com")
    await expect(page.getByRole("textbox", { name: "Page address" })).toHaveValue("example.com")
    await expect(page.getByRole("heading", { name: "Example Domain" })).toBeVisible()
    expect(asked).toEqual(["example.com"])
  })

  test("says why a page couldn't be checked, on the field", async ({ page }) => {
    await answer(page, { error: "That address is on a private network or couldn't be found, so this checker can't load it." }, 422)
    await page.goto("/check")
    const field = page.getByRole("textbox", { name: "Page address" })
    await field.fill("localhost:3000")
    await field.press("Enter")
    await expect(field).toHaveAccessibleDescription(/private network/)
    await expect(field).toHaveAttribute("aria-invalid", "true")
  })

  test("an empty address is caught before anything is asked", async ({ page }) => {
    const asked = await answer(page, report)
    await page.goto("/check")
    await page.getByRole("button", { name: "Check" }).click()
    await expect(page.getByRole("textbox", { name: "Page address" })).toHaveAccessibleDescription(/Enter a web address/)
    expect(asked).toEqual([])
  })

  test("a long address in an error wraps on a phone instead of widening the page", { tag: "@engine" }, async ({ page }) => {
    const long = `https://exa mple.com/${"a".repeat(70)}`
    await answer(page, { error: `"${long}" isn't a web address. Enter one like example.com.` }, 422)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/check?url=${encodeURIComponent(long)}`)
    await expect(page.getByRole("textbox", { name: "Page address" })).toHaveAccessibleDescription(/isn't a web address/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  })

  test("an agent can use the page", async ({ page }) => {
    await answer(page, report)
    await captureAgentTools(page)
    await page.goto("/check?url=example.com")
    await expect(page.getByRole("heading", { name: "Example Domain" })).toBeVisible()
    const result = await checkPage(page)
    expect(result.score, formatAgentReadiness(result, "/check")).toBe(100)
  })

  for (const theme of ["light", "dark"] as const) {
    test(`passes axe in ${theme}, with a report and with an error`, { tag: "@engine" }, async ({ page, browserName }) => {
      test.fixme(browserName === "firefox", "Playwright's Firefox crashes (signal 11) while automation inspects the readiness report; normal use doesn't (HISTORY.md decision log, 2026-11-15)")
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      const asked = await answer(page, report)
      await page.goto("/check?url=example.com")
      await expect(page.locator(".readiness-problems li")).toHaveCount(1)
      const scan = async () => {
        const results = await new AxeBuilder({ page }).include("#main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([])
      }
      await scan()
      await page.unroute("**/api/agent-check?*")
      await answer(page, { error: "example.org didn't load within 20 seconds." }, 504)
      await page.getByRole("textbox", { name: "Page address" }).fill("example.org")
      await page.getByRole("button", { name: "Check" }).click()
      await expect(page.getByText("didn't load within 20 seconds")).toBeVisible()
      await scan()
      expect(asked).toEqual(["example.com"])
    })
  }
})
