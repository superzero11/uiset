// The site's fonts, served from the site itself rather than Google Fonts: a first visit then
// needs no connections to two more servers, the main face can be preloaded so the first paint
// already uses it, and visitors' browsers don't talk to Google.
//
//   node scripts/fonts.mjs
//
// Downloads the Latin and Latin Extended files of each family below from Google Fonts into
// public/fonts/, with each family's license (all are SIL Open Font License 1.1), and writes
// src/site/fonts.css. Run it again after changing the list.

import { mkdirSync, rmSync, writeFileSync } from "node:fs"

const FAMILIES = [
  // The site's own face: text, and the condensed headings (the wdth axis).
  { family: "Instrument Sans", axes: "wdth,wght@75..100,400..700", license: "ofl/instrumentsans" },
  // The skins' faces, used where a skin is shown.
  { family: "Barlow Semi Condensed", axes: "wght@400;500;600", license: "ofl/barlowsemicondensed" },
  { family: "Saira Semi Condensed", axes: "wght@400;500;600", license: "ofl/sairasemicondensed" },
  { family: "Spline Sans Mono", axes: "wght@400;500;600", license: "ofl/splinesansmono" },
  { family: "Literata", axes: "opsz,wght@7..72,400..700", license: "ofl/literata" },
  { family: "Atkinson Hyperlegible", axes: "wght@400;700", license: "ofl/atkinsonhyperlegible" },
]
const SUBSETS = ["latin", "latin-ext"]
const OUT = "public/fonts"
// Google Fonts sends WOFF2 and unicode-range subsets to a current browser.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-")
async function get(url, as = "text") {
  const res = await fetch(url, { headers: { "User-Agent": UA } })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return as === "text" ? res.text() : Buffer.from(await res.arrayBuffer())
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
const faces = [] // { family, subset, block, url: Google's file }
const licenses = []
for (const { family, axes, license } of FAMILIES) {
  const css = await get(`https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:${axes}&display=swap`)
  // Each block follows a comment naming its subset.
  for (const [, subset, block] of css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face\s*{[^}]+})/g)) {
    if (SUBSETS.includes(subset)) faces.push({ family, subset, block, url: /src:\s*url\(([^)]+)\)/.exec(block)[1] })
  }
  licenses.push(`## ${family}\n\n${(await get(`https://raw.githubusercontent.com/google/fonts/main/${license}/OFL.txt`)).trim()}\n`)
}
// One file per Google URL (a variable font serves several weights), named for what it covers:
// instrument-sans-latin-400-700.woff2.
const files = new Map()
for (const { family, subset, url } of faces) {
  if (files.has(url)) continue
  const weights = faces.filter((f) => f.url === url).flatMap((f) => /font-weight:\s*([^;]+);/.exec(f.block)[1].trim().split(/\s+/))
  const range = [...new Set([Math.min(...weights), Math.max(...weights)])].join("-")
  const name = `${slug(family)}-${subset}-${range}.woff2`
  writeFileSync(`${OUT}/${name}`, await get(url, "buffer"))
  files.set(url, name)
}
writeFileSync(`${OUT}/LICENSE.md`, `# Font licenses\n\nThe fonts in this folder are distributed under the SIL Open Font License 1.1. Each\nfamily's copyright notice and license follow.\n\n${licenses.join("\n")}`)
writeFileSync(
  "src/site/fonts.css",
  `/* The site's fonts, served from /fonts (scripts/fonts.mjs writes this file and those). */\n\n${faces
    .map(({ block, url }) => block.replace(url, `/fonts/${files.get(url)}`).replace(/font-display:\s*[a-z]+;/, "font-display: swap;"))
    .join("\n\n")}\n`,
)
console.log(`${files.size} font files, ${faces.length} faces`)
