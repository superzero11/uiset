import type { ComponentType } from "react"
import {
  displaySource,
  groups,
  uiSdkComponents,
  usesOf,
  type ExampleMeta,
} from "./meta"

type ExampleEntry = ExampleMeta & {
  group: string
  // Every registry item the example's source imports: what `shadcn add` needs to run it.
  uses: string[]
  Component: ComponentType
  // Imports read as they do in a project after `shadcn add`.
  source: string
}

type ExampleGroup = { title: string; examples: ExampleEntry[] }

const modules = import.meta.glob<ComponentType>("./*.tsx", {
  eager: true,
  import: "default",
})
const sources = import.meta.glob<string>("./*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
})

const exampleGroups: ExampleGroup[] = groups.map(([title, metas]) => ({
  title,
  examples: metas.map((meta) => {
    const path = `./${meta.slug}.tsx`
    const Component = modules[path]
    const source = sources[path]
    if (!Component || source === undefined)
      throw new Error(`src/site/examples/${meta.slug}.tsx has no default export`)
    return {
      ...meta,
      group: title,
      uses: usesOf(source),
      Component,
      source: displaySource(source),
    }
  }),
}))

const examples: ExampleEntry[] = exampleGroups.flatMap((group) => group.examples)

const examplesBySlug = new Map(examples.map((example) => [example.slug, example]))

const unlisted = Object.keys(modules).filter(
  (path) => !examplesBySlug.has(path.slice(2, -".tsx".length)),
)
if (unlisted.length)
  throw new Error(
    `Examples missing from src/site/examples/index.ts: ${unlisted.join(", ")}`,
  )

// An item's example is the one named after it, else the first that shows it.
const examplesByItem = new Map<string, ExampleEntry>()
for (const example of examples)
  for (const item of example.items)
    if (!examplesByItem.has(item) || example.slug === item)
      examplesByItem.set(item, example)

const uiSdkItemsWithoutExample: string[] = uiSdkComponents.filter(
  (name) => !examplesByItem.has(name),
)

export {
  displaySource,
  exampleGroups,
  examples,
  examplesByItem,
  examplesBySlug,
  uiSdkComponents,
  uiSdkItemsWithoutExample,
}
export type { ExampleEntry, ExampleGroup }
