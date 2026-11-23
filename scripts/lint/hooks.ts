// React's rules of hooks, by oxlint's port of eslint-plugin-react-hooks: React's own plugin
// needs typescript-eslint, which refuses TypeScript 7 (typescript-eslint#10940). Run over the
// files as `read` gives them (staged content with `--staged`), copied to a scratch folder.
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

export const hooksRule = {
  id: "react/rules-of-hooks",
  why: "2026-11-23: a hook called inside managers.find() crashed uiset.dev's home page for four days, and no lint knew React's rules. This is React's own rule (oxlint's port): a hook in a callback, a condition, a loop or after an early return.",
}

type Diagnostics = { diagnostics: { message: string; filename: string; labels: { span: { line: number } }[] }[] }

export function rulesOfHooks(paths: string[], read: (path: string) => string | undefined, root: string) {
  const files = paths.filter((path) => /^(registry|src|web\/src|tests)\/.*\.tsx?$/.test(path))
  if (!files.length) return []
  const dir = mkdtempSync(join(tmpdir(), "uiset-hooks-"))
  try {
    for (const path of files) {
      const text = read(path)
      if (text === undefined) continue
      mkdirSync(dirname(join(dir, path)), { recursive: true })
      writeFileSync(join(dir, path), text)
    }
    let out: string
    try {
      out = execFileSync(join(root, "node_modules/.bin/oxlint"), ["--react-plugin", "-A", "all", "-D", "react/rules-of-hooks", "--format=json", "."], { cwd: dir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    } catch (error) {
      // oxlint exits 1 when it finds something; its report is still on stdout.
      out = (error as { stdout?: string }).stdout ?? ""
      if (!out) throw error
    }
    return (JSON.parse(out) as Diagnostics).diagnostics.map((d) => ({ path: d.filename.replace(/^\.\//, ""), line: d.labels[0]?.span.line ?? 1, rule: hooksRule.id, message: d.message }))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
