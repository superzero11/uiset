import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test } from "vitest"
import { UISet } from "@/registry/uiset/ui/uiset"
import { ChartsDemo } from "@/src/site/charts-demo"
import { settle } from "./bridge"

// The charts kit's demo (src/site/charts-demo.tsx): the legend, pressed and by keyboard. The
// legend is hidden from agents (they isolate a series with the chart's own action), so a
// person's press and Enter drive it here. Moved from tests/e2e/charts.spec.ts.

test("the legend isolates a series, for pointer and keyboard alike", async () => {
  render(
    <UISet>
      <ChartsDemo />
    </UISet>,
  )
  await settle()
  const legend = within(screen.getByRole("group", { name: "Revenue and costs series" }))
  const first = () => within(screen.getByRole("listbox", { name: "Revenue and costs" })).getAllByRole("option")[0]!.getAttribute("aria-label")
  await userEvent.click(legend.getByRole("button", { name: "Costs" }))
  expect(legend.getByRole("button", { name: "Costs" }).getAttribute("aria-pressed")).toBe("true")
  expect(first()).toBe("Jan: Costs $38,000")
  legend.getByRole("button", { name: "Costs" }).focus()
  await userEvent.keyboard("{Enter}")
  await settle()
  expect(legend.getByRole("button", { name: "Costs" }).getAttribute("aria-pressed")).toBe("false")
  expect(first()).toBe("Jan: Revenue $42,000, Costs $38,000")
})
