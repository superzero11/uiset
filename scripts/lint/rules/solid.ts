import { lineOf, type Problem, type RepoRule } from "../core.ts"

const LIST = "solid/to-port.json"
const id = "content/solid-parity"

/** React's views by item name: `button`, `templates/auth`. */
const reactViews = (files: string[]) => files.flatMap((path) => /^registry\/uiset\/ui\/((?:templates\/)?[\w-]+)\.tsx$/.exec(path)?.[1] ?? [])
const solidViews = (files: string[]) => new Set(files.flatMap((path) => /^solid\/src\/((?:templates\/)?[\w-]+)\.tsx$/.exec(path)?.[1] ?? []))

export const solidParity: RepoRule = {
  id,
  why: "2026-11-24: Solid 2.0 support began, item by item, and the owner asked for it done and checked properly. Every React view has a Solid one (solid/src/<name>.tsx) or waits, by name, in solid/to-port.json; a dated release refuses a list with anything on it, so no item is left out without the owner hearing of it. 2026-11-25: the owner paused the port to release 0.7.0 first, with Solid as a preview in the docs; the check applies to the release that publishes @uiset/solid (solid/package.json).",
  checkRepo(ctx) {
    const text = ctx.read(LIST)
    const files = ctx.all ?? ctx.paths
    if (text === undefined) return files.some((path) => path.startsWith("solid/src/")) ? [{ path: LIST, line: 1, rule: id, message: "Missing: it names the React views not yet in Solid." }] : []
    let waiting: string[]
    try {
      waiting = (JSON.parse(text) as { items: string[] }).items
      if (!Array.isArray(waiting)) throw new Error()
    } catch {
      return [{ path: LIST, line: 1, rule: id, message: 'Not JSON with an "items" list of names.' }]
    }
    const react = reactViews(files)
    const solid = solidViews(files)
    const at = (name: string) => lineOf(text, Math.max(0, text.indexOf(`"${name}"`)))
    const problems: Problem[] = []
    for (const name of react)
      if (!solid.has(name) && !waiting.includes(name))
        problems.push({ path: `registry/uiset/ui/${name}.tsx`, line: 1, rule: id, message: `No Solid view: write solid/src/${name}.tsx, or name "${name}" in ${LIST} for now.` })
    for (const name of waiting) {
      if (solid.has(name)) problems.push({ path: LIST, line: at(name), rule: id, message: `"${name}" is in Solid now (solid/src/${name}.tsx): take it off the list.` })
      else if (!react.includes(name)) problems.push({ path: LIST, line: at(name), rule: id, message: `"${name}" has no React view (registry/uiset/ui/${name}.tsx) to port.` })
    }
    const release = /^## (\d+\.\d+\.\d+) \(([^)]+)\)$/m.exec(ctx.read("CHANGELOG.md") ?? "")
    // Only a release that publishes @uiset/solid (it has a package.json) must have all of it.
    if (release && release[2] !== "unreleased" && waiting.length && ctx.read("solid/package.json") !== undefined)
      problems.push({ path: LIST, line: 1, rule: id, message: `${release[1]} is dated, and ${waiting.length} React view${waiting.length === 1 ? " isn't" : "s aren't"} in Solid yet (${waiting.slice(0, 5).join(", ")}${waiting.length > 5 ? ", …" : ""}). Solid ships complete: port them, or ask the owner.` })
    return problems
  },
}
