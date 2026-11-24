import { render, screen, within } from "@solidjs/testing-library"
import { expect, test } from "vitest"
import { UISet } from "@/solid/src/uiset"
import BoardExample from "@/solid/demo/examples/board"
import { createSolidBridge, settle } from "./solid-bridge"

// The board kit's example in Solid (solid/demo/examples/board.tsx, also its kit page), driven
// through the agent bridge with React's assertions (tests/unit/board.bridge.test.tsx).

const bridge = createSolidBridge()

test("filtering by person hides the others' cards", async () => {
  render(() => (
    <UISet>
      <BoardExample />
    </UISet>
  ))
  await settle()
  const board = () => within(screen.getByRole("group", { name: "Sprint board" }))
  expect(board().getAllByRole("option").length).toBeGreaterThan(2)
  const chosen = await bridge.run("Cards for", "setValue", "Grace Hopper")
  expect(chosen.ok, chosen.error?.message).toBe(true)
  expect(board().getAllByRole("option")).toHaveLength(2)
  expect(board().getByRole("option", { name: /Rate-limit the public API/ })).toBeTruthy()
})

test("an agent searches, opens a card from the filtered board, and edits it in the dialog", async () => {
  render(() => (
    <UISet>
      <BoardExample />
    </UISet>
  ))
  await settle()
  const board = () => within(screen.getByRole("group", { name: "Sprint board" }))
  const searched = await bridge.run("Search cards", "setValue", "webhooks")
  expect(searched.ok, searched.error?.message).toBe(true)
  expect(board().getAllByRole("option").map((card) => card.getAttribute("aria-label"))).toEqual(["Retry failed webhooks"])
  const opened = await bridge.run("Sprint board", "openCard", "Retry failed webhooks")
  expect(opened.ok, opened.error?.message).toBe(true)
  const dialog = await screen.findByRole("dialog", { name: "Retry failed webhooks" })
  expect(within(dialog).getByText("In review column.")).toBeTruthy()
  const priority = await bridge.run("Priority", "setValue", "urgent")
  expect(priority.ok, priority.error?.message).toBe(true)
  await bridge.run("Save card", "press")
  await settle()
  expect(screen.queryByRole("dialog", { name: "Retry failed webhooks" })).toBeNull()
  expect(board().getByRole("option", { name: "Retry failed webhooks" }).querySelector(".board-card-meta")?.textContent).toContain("Urgent")
})
