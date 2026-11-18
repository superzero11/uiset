// UISet's project lint: one rule per slip the project has had, so it can't happen twice.
// Each rule says where it came from. `index.ts` runs them; `rules/` holds one file each.

export type Finding = { line: number; message: string }
export type Problem = Finding & { path: string; rule: string }

/** A rule that reads one file at a time. */
export type FileRule = {
  id: string
  /** What happened that made this a rule, or the project rule it holds. */
  why: string
  appliesTo: (path: string) => boolean
  check: (text: string, path: string) => Finding[]
}

/** A rule about the repo as a whole: which files exist, or what a commit changes. */
export type RepoRule = {
  id: string
  why: string
  checkRepo: (ctx: RepoContext) => Problem[]
}

export type Rule = FileRule | RepoRule

export type RepoContext = {
  /** The files in scope: every file in the repo, or only the staged ones. */
  paths: string[]
  /** A file's text: the staged version when linting a commit. */
  read: (path: string) => string | undefined
  /** Whether this is a commit (only staged files) rather than the whole repo. */
  staged: boolean
  /** The lines a staged change adds to a file; empty outside a commit. */
  added: (path: string) => string[]
}

/** Problems allowed to stay for now, per rule and file: they get fixed, then dropped. */
export type Baseline = Record<string, Record<string, number>>

/** Generated, vendored or private files no rule reads. */
export const outOfScope = (path: string) =>
  /^(node_modules|dist|public|\.vercel|test-results|playwright-report|research|launch)\//.test(path) ||
  /(^|\/)node_modules\//.test(path) ||
  path === "pnpm-lock.yaml"

export const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length

const IGNORE = /lint-ignore\s+([\w-]+\/[\w-]+)(?:\s*:\s*(\S.*))?/

/**
 * Lints `ctx` with `rules`. A finding on a line that, or whose line above, says
 * `lint-ignore <rule>: <reason>` is left out; an ignore with no reason, or for a rule that
 * doesn't exist, is a problem of its own. Counts within the baseline are left out too.
 */
export function lint(ctx: RepoContext, rules: Rule[], baseline: Baseline = {}) {
  const known = new Set(rules.map((rule) => rule.id))
  const found: Problem[] = []
  for (const rule of rules) {
    if ("checkRepo" in rule) {
      found.push(...rule.checkRepo(ctx))
      continue
    }
    for (const path of ctx.paths) {
      if (outOfScope(path) || !rule.appliesTo(path)) continue
      const text = ctx.read(path)
      if (text === undefined) continue
      const lines = text.split("\n")
      for (const finding of rule.check(text, path)) {
        const near = [lines[finding.line - 1] ?? "", lines[finding.line - 2] ?? ""]
        const waived = near.some((line) => {
          const m = IGNORE.exec(line)
          return m?.[1] === rule.id && Boolean(m[2])
        })
        if (!waived) found.push({ ...finding, path, rule: rule.id })
      }
    }
  }
  // Ignores themselves: each needs a reason and a real rule.
  for (const path of ctx.paths) {
    if (outOfScope(path) || path.startsWith("scripts/lint/") || path === "tests/unit/lint.test.ts") continue
    const text = ctx.read(path)
    if (!text?.includes("lint-ignore")) continue
    text.split("\n").forEach((line, i) => {
      const m = IGNORE.exec(line)
      if (!m) return
      if (!known.has(m[1]!)) found.push({ path, line: i + 1, rule: "lint/ignore", message: `No lint rule "${m[1]}".` })
      else if (!m[2]) found.push({ path, line: i + 1, rule: "lint/ignore", message: `Say why: "lint-ignore ${m[1]}: <reason>".` })
    })
  }
  // The baseline: a file may keep up to its recorded count of a rule's findings.
  const counts = new Map<string, number>()
  for (const p of found) counts.set(`${p.rule}\u0000${p.path}`, (counts.get(`${p.rule}\u0000${p.path}`) ?? 0) + 1)
  const problems = found.filter((p) => (counts.get(`${p.rule}\u0000${p.path}`) ?? 0) > (baseline[p.rule]?.[p.path] ?? 0))
  const shrinkable: string[] = []
  for (const [rule, files] of Object.entries(baseline))
    for (const [path, allowed] of Object.entries(files)) {
      if (ctx.staged && !ctx.paths.includes(path)) continue
      const now = counts.get(`${rule}\u0000${path}`) ?? 0
      if (now < allowed) shrinkable.push(`${path}: ${rule} ${allowed} → ${now}`)
    }
  return { problems: problems.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line), counts, shrinkable }
}
