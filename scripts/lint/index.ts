// pnpm lint: the whole repo. The pre-commit hook: `--staged`, the commit's files only.
// `--update-baseline` records today's remaining problems so only new ones fail;
// `--rules` lists every rule and why it exists.
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { lint, type Baseline, type RepoContext } from "./core.ts"
import { rules } from "./rules/index.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
const args = new Set(process.argv.slice(2))
const staged = args.has("--staged")
const baselinePath = join(root, "scripts/lint/baseline.json")

if (args.has("--rules")) {
  for (const rule of rules) console.log(`${rule.id}\n  ${rule.why}\n`)
  process.exit(0)
}

const lines = (out: string) => out.split("\n").filter(Boolean)
const ctx: RepoContext = staged
  ? {
      paths: lines(git("diff", "--cached", "--name-only", "--diff-filter=ACMR")),
      read: (path) => {
        try {
          return git("show", `:${path}`)
        } catch {
          return undefined
        }
      },
      staged: true,
      added: (path) =>
        lines(git("diff", "--cached", "-U0", "--", path))
          .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
          .map((line) => line.slice(1)),
    }
  : {
      paths: lines(git("ls-files", "--cached", "--others", "--exclude-standard")).filter((path) => existsSync(join(root, path))),
      read: (path) => (existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : undefined),
      staged: false,
      added: () => [],
    }

const baseline: Baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : {}

if (args.has("--update-baseline")) {
  const { counts } = lint(ctx, rules, {})
  const next: Baseline = {}
  for (const [key, n] of [...counts].sort()) {
    const [rule, path] = key.split("\u0000") as [string, string]
    if (rule.startsWith("plan/") || rule.startsWith("lint/")) continue
    ;(next[rule] ??= {})[path] = n
  }
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`Baseline: ${Object.values(next).reduce((n, files) => n + Object.values(files).reduce((a, b) => a + b, 0), 0)} problems left to fix, in scripts/lint/baseline.json.`)
  process.exit(0)
}

const { problems, shrinkable } = lint(ctx, rules, baseline)
for (const p of problems) console.log(`${p.path}:${p.line}  ${p.rule}  ${p.message}`)
if (shrinkable.length)
  console.log(`\nFixed since the baseline (run pnpm lint --update-baseline to keep them fixed):\n  ${shrinkable.join("\n  ")}`)
if (problems.length) {
  console.log(`\n${problems.length} lint problem${problems.length === 1 ? "" : "s"}. pnpm lint --rules says why each rule exists.`)
  process.exit(1)
}
console.log(`Lint: ${ctx.paths.length} files, ${rules.length} rules, no problems.`)
