// The README's pictures, drawn from the running site so they always show the real thing.
//
//   pnpm dev                       (the site on :5620)
//   node scripts/readme-assets.mjs
//
// Writes .github/assets/*.webp: the banner in light and dark, the five skins as a short
// animation, a picture of each kit, the theme generator, a docs page, a template and the
// Agent Console. Needs cwebp and img2webp (Homebrew: `brew install webp`).

import { chromium } from "@playwright/test"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const SITE = process.env.README_SITE ?? "http://localhost:5620"
const OUT = ".github/assets"
const tmp = mkdtempSync(join(tmpdir(), "uiset-readme-"))
mkdirSync(OUT, { recursive: true })

/** A PNG screenshot to WebP, at most `width` pixels wide. */
function webp(png, name, width) {
  execFileSync("cwebp", ["-quiet", "-q", "86", "-m", "6", "-resize", String(width), "0", png, "-o", join(OUT, `${name}.webp`)])
}

const browser = await chromium.launch({ channel: "chrome" })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce", colorScheme: "light" })
// The sticky site header would land in the middle of tall captures: let it scroll away.
await context.addInitScript(() =>
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style")
    style.textContent = ".site-top { position: static !important; }"
    document.head.append(style)
  }),
)
const page = await context.newPage()
const settle = (ms = 900) => page.waitForTimeout(ms)
/** An element as WebP; one taller than `maxHeight` CSS pixels is cut to its top. */
async function shot(locator, name, width = 1600, maxHeight = 820) {
  await locator.evaluate((el) => el.scrollIntoView({ block: "start" }))
  await settle(400)
  const png = join(tmp, `${name}.png`)
  const box = await locator.boundingBox()
  // Clip in page coordinates, so a crop taller than the viewport isn't cut short by it.
  const top = box.y + (await page.evaluate(() => scrollY))
  if (box.height > maxHeight) await page.screenshot({ path: png, clip: { x: box.x, y: top, width: box.width, height: maxHeight }, fullPage: true, animations: "disabled" })
  else await locator.screenshot({ path: png, animations: "disabled" })
  webp(png, name, width)
  console.log(`  ${name}.webp`)
}

try {
  // The banner, in light and dark: GitHub shows the one that matches the reader's theme.
  await page.setViewportSize({ width: 1200, height: 630 })
  for (const theme of ["light", "dark"]) {
    await page.goto(`${SITE}/og${theme === "dark" ? "?theme=dark" : ""}`, { waitUntil: "networkidle" })
    await settle()
    await shot(page.locator(".og-card"), `banner-${theme}`, 1600)
  }

  // One live form through the five skins, as an animation.
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${SITE}/`, { waitUntil: "networkidle" })
  await settle()
  // The site's caption under the form stays on the site: the README says it in words.
  await page.addStyleTag({ content: ".hero-stage-note { visibility: hidden; }" })
  const stage = page.locator(".hero-stage")
  const skinNames = ["Base", "Blueprint", "Studio", "Phosphor", "Ink"]
  const pick = async (skin) => {
    await page.getByRole("radiogroup", { name: "Skin" }).first().getByRole("radio", { name: skin }).click()
    await settle(700)
  }
  // Every frame of an animation is the same size: one region, as tall as the tallest skin.
  let box = { x: 0, y: 0, width: 0, height: 0 }
  for (const skin of skinNames) {
    await pick(skin)
    const top = (await stage.boundingBox())
    const form = (await page.locator(".hero-surface").boundingBox())
    const height = form.y + form.height - top.y
    box = { x: top.x, y: top.y, width: Math.max(box.width, top.width), height: Math.max(box.height, height) }
  }
  const frames = []
  for (const skin of skinNames) {
    await pick(skin)
    const png = join(tmp, `skin-${skin}.png`)
    await page.screenshot({ path: png, clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: box.height + 32 }, animations: "disabled" })
    frames.push(png)
  }
  // Resize each frame, then hold each for 1.6 s, looping.
  const sized = frames.map((png) => {
    const out = png.replace(".png", ".sized.webp")
    execFileSync("cwebp", ["-quiet", "-q", "84", "-resize", "1000", "0", png, "-o", out])
    return out
  })
  // Every frame a key frame: lossy frames blended onto the last one leave smudges at their edges.
  execFileSync("img2webp", ["-loop", "0", "-kmin", "0", "-kmax", "1", "-lossy", "-q", "86", ...sized.flatMap((f) => ["-d", "1600", f]), "-o", join(OUT, "skins.webp")])
  console.log("  skins.webp")

  // Each kit, as it runs on the kits page.
  const kits = ["chat", "writing", "data", "charts", "board", "scheduler", "canvas", "ide", "mobile", "terminal"]
  await page.goto(`${SITE}/kits`, { waitUntil: "networkidle" })
  await settle(1500)
  // The terminal shows nothing until something runs: a listing, its colors and a build.
  const prompt = page.locator("#terminal").getByRole("textbox").first()
  await prompt.scrollIntoViewIfNeeded()
  for (const [command, wait] of [["ls", 400], ["colors", 400], ["build", 5000]]) {
    await prompt.click()
    await page.keyboard.type(command)
    await page.keyboard.press("Enter")
    await settle(wait)
  }
  for (const id of kits) await shot(page.locator(`#${id} [data-uiset]`).first(), `kit-${id}`, 1200, id === "charts" ? 540 : 820)
  await page.goto(`${SITE}/kits?skin=studio#studio`, { waitUntil: "networkidle" })
  await settle(1200)
  await shot(page.locator("#studio .studio-stage"), "kit-studio", 1200)

  // The Agent Console, working a settings form.
  await page.goto(`${SITE}/agents#agents`, { waitUntil: "networkidle" })
  await settle(1200)
  // Mid-task: the agent has changed two settings through the bridge, and says so.
  await page.locator("#agents").getByRole("button", { name: "Make it public and move it to Europe" }).click()
  await settle(3500)
  await shot(page.locator("#agents .console-stage"), "agent-console", 1400)

  // A template, the theme generator and a docs page.
  await page.goto(`${SITE}/templates?template=dashboard`, { waitUntil: "networkidle" })
  await settle(1500)
  await shot(page.locator(".template-frame").first(), "template-dashboard", 1400, 900)

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${SITE}/themes/generator`, { waitUntil: "networkidle" })
  await settle(1200)
  const generator = join(tmp, "generator.png")
  // Down to the end of the previewed form, so the picture doesn't stop mid-row.
  const formEnd = await page.locator(".generator-screen-form").first().evaluate((el) => el.getBoundingClientRect().bottom + scrollY)
  await page.screenshot({ path: generator, clip: { x: 0, y: 64, width: 1440, height: formEnd + 10 - 64 }, fullPage: true })
  webp(generator, "theme-generator", 1600)
  console.log("  theme-generator.webp")

  await page.goto(`${SITE}/docs/components/select`, { waitUntil: "networkidle" })
  await settle(1200)
  const docs = join(tmp, "docs.png")
  await page.screenshot({ path: docs, clip: { x: 0, y: 64, width: 1440, height: 820 } })
  webp(docs, "docs-page", 1600)
  console.log("  docs-page.webp")
} finally {
  await browser.close()
  rmSync(tmp, { recursive: true, force: true })
}
