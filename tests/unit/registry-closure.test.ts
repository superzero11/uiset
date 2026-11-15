// Every registry item installs on its own: each relative import in its files (and its
// registry dependencies' files) points at a file the same install brings. The install test
// adds every item at once, so a missing file there is hidden by another item's copy.
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, normalize } from "node:path"
import { expect, test } from "vitest"

type Item = { name: string; files: { path: string }[]; registryDependencies?: string[] }
const registry = JSON.parse(readFileSync("registry.json", "utf8")) as { items: Item[] }
const byName = new Map(registry.items.map((item) => [item.name, item]))
const ui = "registry/uiset/ui/"

function closure(name: string, seen = new Set<string>()): Set<string> {
  if (seen.has(name)) return new Set()
  seen.add(name)
  const item = byName.get(name)!
  const files = new Set(item.files.map((f) => normalize(f.path)))
  for (const dep of item.registryDependencies ?? []) {
    const depName = dep.split("/").at(-1)!
    if (byName.has(depName)) for (const f of closure(depName, seen)) files.add(f)
  }
  return files
}

function relativeImports(path: string): string[] {
  const source = readFileSync(path, "utf8")
  const specs = [...source.matchAll(/(?:from|import)\s*["'](\.{1,2}\/[^"']+)["']/g), ...source.matchAll(/@import\s+["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]!)
  return specs.map((spec) => normalize(join(dirname(path), spec)))
}

function resolves(target: string, files: Set<string>): boolean {
  for (const candidate of [target, `${target}.tsx`, `${target}.ts`, join(target, "index.ts"), join(target, "index.tsx")]) if (files.has(normalize(candidate))) return true
  return false
}

for (const item of registry.items) {
  test(`${item.name} installs on its own`, () => {
    const files = closure(item.name)
    const missing: string[] = []
    for (const file of files) {
      if (!/\.(tsx?|css)$/.test(file) || !existsSync(file)) continue
      for (const target of relativeImports(file)) {
        if (!target.startsWith(normalize(ui))) continue
        // Imports inside sample source strings (the IDE's files) point at nothing real.
        const real = [target, `${target}.tsx`, `${target}.ts`, `${target}.css`].some((c) => existsSync(c))
        if (real && !resolves(target, files)) missing.push(`${file.replace(ui, "")} → ${target.replace(ui, "")}`)
      }
    }
    expect(missing).toEqual([])
  })
}
