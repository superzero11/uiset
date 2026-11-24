// Every Solid example renders on the server, as SolidStart renders a page: no throw, nothing
// said on the console, and its markup sent. Hydrating that markup is the browser's half
// (tests/e2e/solid/root.spec.ts, /ssr/components).
import { renderToString, type JSX } from "@solidjs/web"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { UISet } from "@/solid/src/uiset"
import { Components, exampleCount } from "@/solid/demo/components-page"
import { pages } from "@/solid/demo/ssr/pages"

const modules = import.meta.glob<{ default: () => JSX.Element }>("../../solid/demo/examples/*.tsx", { eager: true })
const examples = Object.entries(modules).map(([path, module]) => [path.split("/").pop()!.replace(".tsx", ""), module.default] as const)

let said: string[] = []
beforeEach(() => {
  said = []
  for (const level of ["warn", "error"] as const) vi.spyOn(console, level).mockImplementation((...args) => void said.push(`${level}: ${args.map(String).join(" ")}`))
})
afterEach(() => vi.restoreAllMocks())

test("there is an example for each ported item to render", () => {
  expect(examples.length).toBeGreaterThan(80)
})

test.each(examples)("%s renders on the server", (_name, Example) => {
  const html = renderToString(() => (
    <UISet>
      <Example />
    </UISet>
  ))
  expect(html).toContain("data-uiset")
  // More than the root: the example drew something.
  expect(html.replace(/<div[^>]*data-uiset[^>]*>/, "").length).toBeGreaterThan(40)
  // Nothing only the server can open, like an address for a file in its memory.
  expect(html).not.toContain("blob:")
  expect(said, "said on the console while rendering").toEqual([])
})

test("the whole components page renders on the server, every example in it", () => {
  const html = renderToString(() => <Components />)
  expect(html.match(/<article class="example"/g)?.length).toBe(exampleCount)
  expect(said).toEqual([])
})

test.each([
  ["chat", 'role="log"'],
  ["rich-text", 'role="textbox"'],
  ["data-grid", 'role="grid"'],
  ["board", 'aria-roledescription="board"'],
])("the %s kit's demo renders on the server", (name, mark) => {
  const Page = pages[name]!
  const html = renderToString(() => <Page />)
  expect(html).toContain(mark)
  expect(html).not.toContain("blob:")
  expect(said).toEqual([])
})
