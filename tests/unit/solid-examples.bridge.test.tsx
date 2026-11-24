import { render } from "@solidjs/testing-library"
import type { JSX } from "@solidjs/web"
import { createAgent } from "@ui-sdk/solid/agent"
import { expect, test } from "vitest"
import { Toaster } from "@/solid/src/toast"
import { UISet } from "@/solid/src/uiset"
import { settle } from "./solid-bridge"

// Every Solid example on the Components page (solid/demo/examples, the React docs pages'
// examples in Solid), one at a time: each component in it is named for an agent, as the React
// examples are. A component an agent can't name is one it can't find or tell apart.

const modules = import.meta.glob<{ default: () => JSX.Element }>("../../solid/demo/examples/*.tsx", { eager: true })
const agent = createAgent()

test("there's an example for every Solid component page", () => {
  expect(Object.keys(modules)).toHaveLength(68)
})

for (const [path, module] of Object.entries(modules)) {
  const name = path.split("/").pop()!.replace(".tsx", "")
  test(`${name}: every component in it is named for agents`, async () => {
    const Example = module.default
    render(() => (
      <UISet>
        <Example />
        <Toaster />
      </UISet>
    ))
    await settle()
    const unnamed = agent
      .snapshot()
      .filter((entry) => !entry.offPage && !entry.label?.trim())
      .map((entry) => entry.component)
    expect(unnamed).toEqual([])
  })
}
