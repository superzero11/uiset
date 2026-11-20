import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : []
  })

// --ui-ring is the soft halo around a focused field, a translucent tint; it can't carry a
// focus outline at 3:1. Outlines use --ui-ring-border, as base.css does.
test("focus outlines use the ring border color, never the translucent halo", () => {
  const offenders = cssFiles("registry").flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .map((line, i) => ({ file, line: i + 1, text: line.trim() }))
      .filter(({ text }) => /outline[^:]*:[^;]*var\(--ui-ring\)/.test(text)),
  )
  expect(offenders).toEqual([])
})

// Layers keep skins nestable; only the reduced-motion reset may use !important.
test("no !important outside the reduced-motion reset", () => {
  const offenders = cssFiles("registry").flatMap((file) => {
    const text = readFileSync(file, "utf8")
    return [...text.matchAll(/!important/g)]
      .filter((m) => {
        const before = text.slice(Math.max(0, m.index! - 700), m.index)
        return !/prefers-reduced-motion|\[data-motion="reduce"\]|\[hidden\]/.test(before)
      })
      .map((m) => `${file}:${text.slice(0, m.index).split("\n").length}`)
  })
  expect(offenders).toEqual([])
})
