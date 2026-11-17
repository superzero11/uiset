// Loads a public page in headless Chromium and runs the agent-readiness check on it: through
// the page's UI SDK bridge when it has one, by reading the page when not.
import type { BrowserServer } from "playwright-core"
import type { AgentReadinessReport } from "../../registry/uiset/ui/agent-check/check"
import type { PageReadinessReport } from "../../registry/uiset/ui/agent-check/page"
import { captureAgentTools, checkPage, waitForAgent } from "../../registry/uiset/ui/agent-check/playwright"
import { CheckError, publicUrl, userAgent } from "./guard"
import { startProxy } from "./proxy"

type Checked = {
  /** The address as entered, made a URL. */
  url: string
  /** Where the page ended up, after redirects. */
  finalUrl: string
  title: string
  report: AgentReadinessReport | PageReadinessReport
}

/** How long a check may take, all in: the function has a minute. */
const timeLimit = 45_000

// The browser gets only what it needs to run, not the function's environment.
const browserEnv = () =>
  Object.fromEntries(["PATH", "HOME", "TMPDIR", "LANG", "TZ", "FONTCONFIG_PATH", "LD_LIBRARY_PATH"].flatMap((name) => (process.env[name] ? [[name, process.env[name]!]] : [])))

/** A browser for one check, sending every connection through the proxy. */
async function launch(proxy: string): Promise<BrowserServer> {
  const { chromium } = await import("playwright-core")
  // The proxy carries loopback addresses too, and WebRTC sends nothing around it.
  const args = [`--proxy-server=${proxy}`, "--proxy-bypass-list=<-loopback>", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"]
  if (process.env.VERCEL) {
    // Vercel's functions have no browser. This Chromium is built for them; its package has no
    // browser in it, so the pack for this machine's processor comes from its release on a cold
    // start, and is kept for the instance.
    const sparticuz = (await import("@sparticuz/chromium-min")).default
    const arch = process.arch === "arm64" ? "arm64" : "x64"
    const executablePath = await sparticuz.executablePath(`https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.${arch}.tar`)
    // Its default flags switch off protections that a browser loading strangers' pages keeps.
    const unsafe = new Set(["--disable-web-security", "--allow-running-insecure-content", "--disable-site-isolation-trials"])
    // It also sets the variables its libraries and fonts need, so the environment is read after.
    return chromium.launchServer({ executablePath, headless: true, env: browserEnv(), args: [...sparticuz.args.filter((arg) => !unsafe.has(arg)), ...args] })
  }
  // Elsewhere, as the project's tests do: installed Chrome on a developer's machine, Playwright's
  // own Chromium under CI. AGENT_CHECK_CHANNEL chooses another.
  const channel = process.env.AGENT_CHECK_CHANNEL ?? (process.env.CI ? undefined : "chrome")
  return chromium.launchServer({ channel: channel || undefined, headless: true, env: browserEnv(), args })
}

/**
 * Checks the page at an address, or throws a CheckError to show the person who asked. Each check
 * has its own proxy and browser, and both are gone when it ends, finished or not.
 */
async function checkUrl(input: string | null | undefined): Promise<Checked> {
  const start = await publicUrl(input)
  const proxy = await startProxy()
  let server: BrowserServer | undefined
  let over = false
  let step = "starting the browser"

  const run = async (): Promise<Checked> => {
    server = await launch(proxy.server)
    if (over) return server.kill().then(() => Promise.reject(new Error("Out of time.")))
    const { chromium } = await import("playwright-core")
    const browser = await chromium.connect(server.wsEndpoint())
    const context = await browser.newContext({ userAgent, viewport: { width: 1280, height: 800 }, serviceWorkers: "block", acceptDownloads: false })
    const page = await context.newPage()
    page.setDefaultTimeout(15_000)
    // Images, media and fonts aren't needed to read controls and names.
    await page.route("**/*", (route) => {
      const kind = route.request().resourceType()
      return kind === "image" || kind === "media" || kind === "font" ? route.abort("blockedbyclient") : route.continue()
    })
    await captureAgentTools(page)
    step = "loading the page"
    const response = await page.goto(start.href, { waitUntil: "domcontentloaded", timeout: 20_000 }).catch(() => {
      throw proxy.refused.size > 0
        ? new CheckError(`${start.host} leads to an address on a private network, so this checker can't load it.`)
        : new CheckError(`${start.host} didn't load within 20 seconds.`, 504)
    })
    if (response && response.status() >= 400) throw new CheckError(`${start.host} answered with an error (${response.status()}), so there was no page to check.`, 502)
    step = "waiting for the page's scripts"
    await page.waitForLoadState("load", { timeout: 8_000 }).catch(() => {})
    // A UI SDK app's bridge, if it registers one; any page's controls, once its scripts have drawn them.
    await waitForAgent(page, { timeout: 2_500 }).catch(() => {})
    await page.waitForTimeout(1_000)
    step = "checking the page"
    const report = await checkPage(page)
    return { url: start.href, finalUrl: page.url(), title: (await page.title()).slice(0, 200), report }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const outOfTime = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      over = true
      console.warn(`agent-check: ${start.href} ran out of time while ${step}`)
      reject(new CheckError(`${start.host} took longer than ${timeLimit / 1000} seconds to check, so the checker stopped.`, 504))
    }, timeLimit)
  })
  const checking = run()
  // Once time is up, what's still running fails as its browser goes; nobody is waiting for it.
  checking.catch(() => {})
  try {
    return await Promise.race([checking, outOfTime])
  } finally {
    clearTimeout(timer)
    await server?.kill()
    proxy.close()
  }
}

export { checkUrl }
export type { Checked }
