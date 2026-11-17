import type { ComponentType } from "react"
import { groups, type ExampleMeta } from "./meta"

// The components page's examples, in page order. Each one's code loads when the gallery asks
// for it (components-page.tsx), so opening the page doesn't wait for all of them.

type ExampleEntry = ExampleMeta & {
  group: string
  load: () => Promise<ComponentType>
}

type ExampleGroup = { title: string; examples: ExampleEntry[] }

const modules = import.meta.glob<ComponentType>("./*.tsx", { import: "default" })

const exampleGroups: ExampleGroup[] = groups.map(([title, metas]) => ({
  title,
  examples: metas.map((meta) => {
    const load = modules[`./${meta.slug}.tsx`]
    if (!load) throw new Error(`src/site/examples/${meta.slug}.tsx is listed in meta.ts but missing`)
    return { ...meta, group: title, load }
  }),
}))

const examples: ExampleEntry[] = exampleGroups.flatMap((group) => group.examples)

const listed = new Set(examples.map((example) => `./${example.slug}.tsx`))
const unlisted = Object.keys(modules).filter((path) => !listed.has(path))
if (unlisted.length) throw new Error(`Examples missing from src/site/examples/meta.ts: ${unlisted.join(", ")}`)

export { exampleGroups, examples }
export type { ExampleEntry, ExampleGroup }
