import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import type { Card } from "@/src/site/library"
import { LibraryCard } from "@/src/site/library-card"
import { InstallCommand } from "@/src/site/shell/code"
import { PageBoundary } from "@/src/site/shell/layout"
import { createBridge, settle } from "./bridge"

// The site's install commands and the library's cards, which follow one package manager. On
// 2026-11-23 a card's copy button called its hook once per manager it checked, so switching
// managers on the home page crashed the page (React error #310).

const bridge = createBridge()
afterEach(() => cleanup())

const card: Card = { id: "button", title: "Button", description: "A button.", href: "/components/button", items: ["button"] }
const runs = { pnpm: "pnpm dlx", npm: "npx", yarn: "yarn dlx", bun: "bunx --bun" }

test("switching the package manager beside library cards redraws every command, through all four and back", async () => {
  render(
    <>
      <InstallCommand items={["data-grid"]} label="Add what you need" />
      <LibraryCard card={card} skin="base" preview={() => null} />
    </>,
  )
  await settle()
  for (const pm of ["npm", "yarn", "bun", "pnpm", "bun", "npm", "pnpm"] as const) {
    const result = await bridge.run("Package manager to add what you need", "setValue", pm)
    expect(result.ok, result.error?.message).toBe(true)
    expect(screen.getByRole("group", { name: "Add what you need" }).textContent).toContain(`${runs[pm]} shadcn@latest add @uiset/data-grid`)
    expect(screen.getByRole("link", { name: "Button" })).toBeTruthy()
  }
})

test("a page that throws while it draws says so, instead of leaving the site blank", () => {
  const Broken = () => {
    throw new Error("drawn wrong")
  }
  const quiet = console.error
  console.error = () => {}
  try {
    render(
      <PageBoundary>
        <Broken />
      </PageBoundary>,
    )
  } finally {
    console.error = quiet
  }
  expect(screen.getByRole("alert").textContent).toContain("This page hit a problem")
  expect(screen.getByRole("link", { name: "Reload the page" })).toBeTruthy()
})
