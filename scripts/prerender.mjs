// Renders every page of the built site in a browser and saves the result, so search engines
// and AI answer engines get each page's full content, title, description and structured data
// without running JavaScript. The app takes over when it loads.
//
//   pnpm build:static   (vite build, then this script)
//
// Writes dist/<path>/index.html for every page, dist/app.html (the bare app, for paths that
// aren't pages), dist/sitemap.xml, dist/robots.txt and dist/og.png.

import { chromium } from "@playwright/test"
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { preview } from "vite"

const SITE = JSON.parse(readFileSync("uiset.config.json", "utf8")).homepage
const port = 5698
const base = `http://localhost:${port}`

// The bare app, for paths that aren't pages: Vite's own index.html, before this script fills
// it. Run twice on one build, index.html is already a page, and app.html is kept.
if (/<div id="root"><\/div>/.test(readFileSync("dist/index.html", "utf8"))) copyFileSync("dist/index.html", "dist/app.html")
else if (!existsSync("dist/app.html")) throw new Error("dist/index.html is already prerendered and there's no dist/app.html: run vite build first.")

// The module preloads Vite's own index.html carries (the entry's shared chunks): kept.
const appPreloads = new Set([...readFileSync("dist/app.html", "utf8").matchAll(/<link rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]))

const server = await preview({ preview: { port, strictPort: true }, logLevel: "warn" })
const browser = await chromium.launch(process.env.CI ? {} : { channel: "chrome" })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", colorScheme: "light" })

async function render(path) {
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" })
  await page.waitForFunction(() => !document.querySelector(".page-loading, .docs-loading"), null, { timeout: 20000 })
  await page.waitForTimeout(250)
  // Vite adds the CSS and module preloads for code the page loaded on demand with full URLs,
  // here this local server's; on the site they must be relative to it. Preloads for every
  // chunk this browser happened to load are dropped (the components page had 331): the
  // drawn page needs only its CSS, and the app fetches its own code before it takes over.
  const html = `<!doctype html>\n${await page.evaluate(() => document.documentElement.outerHTML)}`
    .replaceAll(base, "")
    .replace(/<link rel="modulepreload"[^>]*>/g, (tag) => (appPreloads.has(/href="([^"]+)"/.exec(tag)?.[1] ?? "") ? tag : ""))
    // A stylesheet that loads without blocking paint (the fonts) ran its onload here; put it
    // back as it ships, or every page would wait for it.
    .replaceAll(`media="all" onload="this.media='all'"`, `media="print" onload="this.media='all'"`)
  await page.close()
  if (errors.length) console.warn(`  ${path}: ${errors.join("; ")}`)
  // A page that names this machine would send visitors' browsers to their own.
  const local = /https?:\/\/(localhost|127\.0\.0\.1)[:/]/.exec(html)
  if (local) throw new Error(`${path} still points at ${local[0]}…; make it relative before writing it.`)
  return html
}

try {
  const first = await context.newPage()
  await first.goto(base, { waitUntil: "networkidle" })
  const paths = await first.evaluate(() => window.__sitePaths())
  await first.close()
  if (!Array.isArray(paths) || !paths.length) throw new Error("The app didn't list its pages (window.__sitePaths).")

  for (const path of paths) {
    const html = await render(path)
    const file = path === "/" ? "dist/index.html" : join("dist", path, "index.html")
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, html)
  }
  console.log(`prerendered ${paths.length} pages`)

  // The social card: the /og page, drawn at 1200×630.
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await og.goto(`${base}/og`, { waitUntil: "networkidle" })
  await og.waitForTimeout(400)
  await og.locator(".og-card").screenshot({ path: "dist/og.png" })
  await og.close()

  const today = new Date().toISOString().slice(0, 10)
  writeFileSync(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
      .map((p) => `  <url><loc>${SITE}${p === "/" ? "/" : p}</loc><lastmod>${today}</lastmod><priority>${p === "/" ? "1.0" : p.split("/").length > 3 ? "0.6" : "0.8"}</priority></url>`)
      .join("\n")}\n</urlset>\n`,
  )
  // Search engines and AI crawlers are welcome: the docs exist to be found and quoted.
  writeFileSync(
    "dist/robots.txt",
    [
      "User-agent: *",
      "Allow: /",
      "",
      "# AI crawlers and answer engines: welcome. llms.txt lists the docs; llms-full.txt has them all.",
      ...["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"].flatMap((bot) => [`User-agent: ${bot}`, "Allow: /", ""]),
      `Sitemap: ${SITE}/sitemap.xml`,
      "",
    ].join("\n"),
  )
  console.log("wrote sitemap.xml, robots.txt, og.png")
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
