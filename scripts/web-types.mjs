// Writes @uiset/web's type declarations into web/dist/types, after `vite build` has made the
// rest of web/dist. tsc emits one .d.ts per source file; this then makes them stand on their
// own in a package: imports through the repo's "@/…" alias become relative, and imports that
// only load styles or define UI SDK's elements are dropped.
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"

const out = "web/dist/types"
rmSync(out, { recursive: true, force: true })
try {
  execFileSync("pnpm", ["exec", "tsc", "-p", "web/tsconfig.types.json"], { stdio: "pipe" })
} catch (error) {
  console.error(String(error.stdout ?? error.message))
  console.error("web types: tsc couldn't write the declarations.")
  process.exit(1)
}

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".d.ts") ? [path] : []
  })

// The primitives marked @internal are left out of the declarations, but tsc still writes
// their names into each file's export list.
const sources = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? sources(path) : path.endsWith(".ts") ? [path] : []
  })
const internal = new Set(
  sources("registry/uiset/ui").flatMap((path) => [...readFileSync(path, "utf8").matchAll(/\/\*\* @internal[^\n]*\*\/\n(?:export )?const (\w+)/g)].map((m) => m[1])),
)

const all = files(out)
const problems = []
for (const file of all) {
  let text = readFileSync(file, "utf8")
  text = text.replace(/^export \{([^}]*)\};$/gm, (line, names) => {
    const kept = names.split(",").map((name) => name.trim()).filter((name) => name && !internal.has(name.split(" as ")[0].trim()))
    return kept.length ? `export { ${kept.join(", ")} };` : ""
  })
  // Side-effect imports: styles, and UI SDK entries that only define elements.
  text = text.replace(/^import "[^"]+";\n/gm, "")
  // "@/registry/…" is this repo's alias for its root, which is the root of these files too.
  text = text.replace(/(from |import\()"@\/([^"]+)"/g, (_, lead, path) => {
    let to = relative(dirname(file), join(out, path)).replaceAll("\\", "/")
    if (!to.startsWith(".")) to = `./${to}`
    return `${lead}"${to}"`
  })
  for (const [, spec] of text.matchAll(/(?:from |import\()"(\.[^"]+)"/g)) {
    const target = resolve(dirname(file), spec)
    if (!existsSync(`${target}.d.ts`) && !existsSync(join(target, "index.d.ts"))) problems.push(`${file}: "${spec}" has no declarations`)
  }
  if (/"@\//.test(text)) problems.push(`${file}: still imports through "@/"`)
  writeFileSync(file, text)
}

const entry = join(out, "web/src/uiset.d.ts")
if (!existsSync(entry)) problems.push(`${entry} wasn't written`)
else if (!readFileSync(entry, "utf8").includes('"uiset-data-grid": UISetDataGrid')) problems.push(`${entry} has no tag map`)
if (problems.length) {
  console.error(problems.join("\n"))
  process.exit(1)
}

// The declarations have to stand on their own in someone else's project, with library
// checking on: check them the way that project would.
try {
  execFileSync(
    "pnpm",
    ["exec", "tsc", "--ignoreConfig", "--noEmit", "--strict", "--skipLibCheck", "false", "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "bundler", "--lib", "ES2022,DOM,DOM.Iterable", "--types", "", entry],
    { stdio: "pipe" },
  )
} catch (error) {
  console.error(String(error.stdout ?? error.message))
  console.error("web types: the declarations don't typecheck on their own.")
  process.exit(1)
}
console.log(`web types: ${all.length} declaration files in ${out}`)
