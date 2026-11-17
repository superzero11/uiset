// A framework that finds a member on an element by an attribute's name sets it as a property
// instead of writing the attribute (Vue does). So an element may not have a member with an
// attribute's name unless that member can be set: a getter with a setter. A getter alone, a
// method or a private field there makes the attribute unreachable from a template.
import { readdirSync, readFileSync } from "node:fs"
import { expect, test } from "vitest"

const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

type Found = { element: string; attribute: string; why: string }

function shadowed(source: string, file: string): Found[] {
  const found: Found[] = []
  const parts = source.split(/\nclass (\w+)(?:<[^>]*>)? extends (?:\w+|Evented<\w+>\(\)) \{/)
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i]!
    const end = parts[i + 1]!.indexOf("\n}\n")
    const body = end < 0 ? parts[i + 1]! : parts[i + 1]!.slice(0, end)
    const observed = /static observedAttributes = \[([^\]]*)\]/.exec(body)?.[1] ?? ""
    const attributes = new Set([
      ...[...observed.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]!),
      ...[...body.matchAll(/(?:this\.(?:get|has)Attribute|isOn\(this, )\(?"([a-z-]+)"\)/g)].map((m) => m[1]!),
    ])
    const getters = new Set([...body.matchAll(/\n  (?:private |protected )?get (\w+)\(/g)].map((m) => m[1]!))
    const setters = new Set([...body.matchAll(/\n  set (\w+)\(/g)].map((m) => m[1]!))
    const methods = new Set([...body.matchAll(/\n  (?:private |protected |async |override )*(\w+)(?:<[^>]*>)?\([^)]*\)\s*(?::[^{\n]+)?\{/g)].map((m) => m[1]!))
    const fields = new Set([...body.matchAll(/\n  (?:private |protected |readonly )*(\w+)[?!]?\s*(?::[^=\n]+)?=/g)].map((m) => m[1]!))
    for (const attribute of attributes) {
      const member = camel(attribute)
      const element = `${file} ${name}`
      if (getters.has(member) && !setters.has(member)) found.push({ element, attribute, why: "a getter with no setter" })
      else if (methods.has(member) && !getters.has(member)) found.push({ element, attribute, why: "a method" })
      else if (fields.has(member) && !getters.has(member)) found.push({ element, attribute, why: "a field" })
    }
  }
  return found
}

const files = readdirSync("web/src").filter((file) => file.endsWith(".ts") && !file.includes("demo"))

test("no web element has a member that hides one of its attributes", () => {
  const problems = files.flatMap((file) => shadowed(readFileSync(`web/src/${file}`, "utf8"), file))
  expect(problems.map((p) => `${p.element}: "${p.attribute}" is hidden by ${p.why}`)).toEqual([])
})

test("the check sees a hidden attribute when there is one", () => {
  const element = `
class Probe extends HTMLElement {
  static observedAttributes = ["label", "row-height"]
  private get label() {
    return this.getAttribute("label") ?? ""
  }
  private rowHeight() {
    return Number(this.getAttribute("row-height"))
  }
  get shown() {
    return this.hasAttribute("shown")
  }
  set shown(value: boolean) {
    this.toggleAttribute("shown", value)
  }
}
`
  expect(shadowed(element, "probe.ts").map((p) => `${p.attribute}: ${p.why}`).sort()).toEqual(["label: a getter with no setter", "row-height: a method"])
})

test("every element class was read, so the check isn't passing on nothing", () => {
  const classes = files.flatMap((file) => [...readFileSync(`web/src/${file}`, "utf8").matchAll(/\nclass (\w+)(?:<[^>]*>)? extends (?:ElementBase|Evented<\w+>\(\)) \{/g)].map((m) => m[1]!))
  expect(classes.length).toBeGreaterThan(30)
  expect(classes).toEqual(expect.arrayContaining(["UISetDataGrid", "UISetSearchField", "UISetRichText", "UISetAgentActivity", "UISetAppShell", "UISetChart"]))
})
