import { render, screen, within } from "@testing-library/react"
import { expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import BoardExample from "@/src/site/examples/board"
import { createBridge, settle } from "./bridge"

// The gallery's board (src/site/examples/board.tsx), driven through the agent bridge. Moved
// from tests/e2e/board.spec.ts.

const bridge = createBridge()

test("filtering by person hides the others' cards", async () => {
  render(
    <UISet>
      <BoardExample />
    </UISet>,
  )
  await settle()
  const board = () => within(screen.getByRole("group", { name: "Sprint board" }))
  expect(board().getAllByRole("option").length).toBeGreaterThan(2)
  const chosen = await bridge.run("Cards for", "setValue", "Grace Hopper")
  expect(chosen.ok, chosen.error?.message).toBe(true)
  expect(board().getAllByRole("option")).toHaveLength(2)
  expect(board().getByRole("option", { name: /Rate-limit the public API/ })).toBeTruthy()
})
