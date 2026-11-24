// pnpm lint: the whole repo. The pre-commit hook: `--staged`, the commit's files only. The
// pre-push hook: `--push`, what a deploy of uiset.dev must agree with on npm.
// `--update-baseline` records today's remaining problems so only new ones fail;
// `--rules` lists every rule and why it exists.
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { lint, type Baseline, type RepoContext } from "./core.ts"
import { hooksRule, rulesOfHooks } from "./hooks.ts"
import { rules } from "./rules/index.ts"
import { docsAheadOfNpm } from "./rules/release.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")
// stderr piped: a rule may ask for a file that isn't there, and `read` answers undefined quietly.
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
const args = new Set(process.argv.slice(2))
const staged = args.has("--staged")
const baselinePath = join(root, "scripts/lint/baseline.json")

if (args.has("--rules")) {
  for (const rule of [...rules, hooksRule, docsAheadOfNpm]) console.log(`${rule.id}\n  ${rule.why}\n`)
  process.exit(0)
}

if (args.has("--push")) {
  const pin = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).dependencies["@ui-sdk/core"] as string
  let published: { version: string; peerDependencies?: Record<string, string> }
  try {
    const response = await fetch("https://registry.npmjs.org/@uiset%2fweb/latest", { signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error(`npm answered ${response.status}`)
    published = await response.json()
  } catch (error) {
    console.log(`${docsAheadOfNpm.id}  Couldn't read @uiset/web from npm (${(error as Error).message}), so the push isn't checked. Try again once npm answers.`)
    process.exit(1)
  }
  const problem = docsAheadOfNpm.check(pin, published)
  if (problem) {
    console.log(`${docsAheadOfNpm.id}  ${problem}`)
    process.exit(1)
  }
  console.log(`Push check: npm's @uiset/web ${published.version} takes UI SDK ${pin}, as the docs say.`)
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

const linted = lint(ctx, rules, baseline)
const problems = [...linted.problems, ...rulesOfHooks(ctx.paths, ctx.read, root)]
const { shrinkable } = linted
for (const p of problems) console.log(`${p.path}:${p.line}  ${p.rule}  ${p.message}`)
if (shrinkable.length)
  console.log(`\nFixed since the baseline (run pnpm lint --update-baseline to keep them fixed):\n  ${shrinkable.join("\n  ")}`)
if (problems.length) {
  console.log(`\n${problems.length} lint problem${problems.length === 1 ? "" : "s"}. pnpm lint --rules says why each rule exists.`)
  process.exit(1)
}
console.log(`Lint: ${ctx.paths.length} files, ${rules.length + 1} rules, no problems.`)
