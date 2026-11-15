import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { afterEach, expect, test, vi } from "vitest"
import { Alert } from "@/registry/uiset/ui/alert"
import {
  AppShell,
  SidebarGroup,
  SidebarItem,
  SidebarNav,
} from "@/registry/uiset/ui/app-shell"
import { Breadcrumbs } from "@/registry/uiset/ui/breadcrumbs"
import { CopyButton } from "@/registry/uiset/ui/copy-button"
import { SearchField } from "@/registry/uiset/ui/search-field"
import { Loading } from "@/registry/uiset/ui/skeleton"
import { Stat } from "@/registry/uiset/ui/stat"
import { Stepper } from "@/registry/uiset/ui/stepper"

const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

function setWidth(narrow: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: narrow,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
}

afterEach(() => localStorage.clear())

function Shell() {
  return (
    <AppShell
      contentElement="div"
      brand="Acme"
      sidebar={
        <SidebarNav>
          <SidebarGroup title="Workspace">
            <SidebarItem href="#a" current>
              Overview
            </SidebarItem>
            <SidebarItem href="#b">Projects</SidebarItem>
          </SidebarGroup>
        </SidebarNav>
      }
    >
      <p>Content</p>
    </AppShell>
  )
}

test("the sidebar collapses with its button and with Mod+B, and remembers", async () => {
  setWidth(false)
  const { container, unmount } = render(<Shell />)
  await tick()
  expect(
    screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current"),
  ).toBe("page")
  await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }))
  expect(container.querySelector('[data-sidebar="collapsed"]')).toBeTruthy()
  await userEvent.keyboard("{Control>}b{/Control}")
  await tick()
  expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }))
  expect(localStorage.getItem("uiset-sidebar") ?? "").toContain("collapsed")
  unmount()
  render(<Shell />)
  await tick()
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy()
})

test("on a narrow screen the sidebar moves into a drawer", async () => {
  setWidth(true)
  render(<Shell />)
  await tick()
  expect(screen.queryByRole("link", { name: "Overview" })).toBeNull()
  await userEvent.click(screen.getByRole("button", { name: "Open navigation" }))
  expect(await screen.findByRole("link", { name: "Overview" })).toBeTruthy()
})

test("breadcrumbs mark the current page and link the rest", () => {
  render(<Breadcrumbs items={[{ label: "Projects", href: "/p" }, { label: "Atlas" }]} />)
  expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Projects" })).toBeTruthy()
  expect(screen.getByText("Atlas").getAttribute("aria-current")).toBe("page")
})

test("a linear stepper marks the current step and locks the ones ahead", async () => {
  const onValueChange = vi.fn()
  render(
    <Stepper
      steps={[
        { value: "a", label: "Account" },
        { value: "b", label: "Details" },
        { value: "c", label: "Review" },
      ]}
      value="b"
      onValueChange={onValueChange}
    />,
  )
  await tick()
  expect(
    screen.getByRole("button", { name: /Details/ }).getAttribute("aria-current"),
  ).toBe("step")
  expect(screen.getByRole("button", { name: /Account/ }).textContent).toContain("(done)")
  expect(screen.getByRole("button", { name: /Review/ }).hasAttribute("disabled")).toBe(
    true,
  )
  await userEvent.click(screen.getByRole("button", { name: /Account/ }))
  expect(onValueChange).toHaveBeenCalledWith("a")
})

test("search focuses with / and clears with its button", async () => {
  render(
    <>
      <button>Elsewhere</button>
      <SearchField label="Search docs" />
    </>,
  )
  await tick()
  const box = screen.getByRole("searchbox", { name: "Search docs" }) as HTMLInputElement
  screen.getByRole("button", { name: "Elsewhere" }).focus()
  await userEvent.keyboard("/")
  expect(document.activeElement).toBe(box)
  await userEvent.type(box, "tokens")
  await userEvent.click(screen.getByRole("button", { name: "Clear search docs" }))
  expect(box.value).toBe("")
  expect(document.activeElement).toBe(box)
})

test("an agent sees one named search box and can clear it", async () => {
  const agent = createAgent()
  render(<SearchField label="Search docs" defaultValue="tokens" />)
  await tick()
  const entries = agent.snapshot().filter((e) => !e.offPage)
  expect(entries.map((e) => e.label)).toEqual(["Search docs"])
  expect((await agent.act({ steps: [{ ref: "Search docs", action: "clear" }] })).ok).toBe(
    true,
  )
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("")
})

test("copy writes to the clipboard and says so", async () => {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  })
  render(<CopyButton value="npx shadcn add x" label="Copy command" />)
  await userEvent.click(screen.getByRole("button", { name: "Copy command" }))
  expect(writeText).toHaveBeenCalledWith("npx shadcn add x")
  expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy()
})

test("copy buttons that share a page can carry fuller names", () => {
  render(
    <>
      <CopyButton value="a" aria-label="Copy app.tsx" />
      <CopyButton value="b" aria-label="Copy styles.css" />
    </>,
  )
  expect(screen.getByRole("button", { name: "Copy app.tsx" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Copy styles.css" })).toBeTruthy()
})

test("alerts name their tone, interrupt only when urgent, and can be dismissed", async () => {
  const onDismiss = vi.fn()
  const { rerender } = render(
    <Alert tone="warning" title="Card expires soon" onDismiss={onDismiss} />,
  )
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.getByText(/Warning:/)).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Dismiss" }))
  expect(onDismiss).toHaveBeenCalled()
  rerender(<Alert tone="danger" title="Payment failed" urgent />)
  expect(screen.getByRole("alert").textContent).toContain("Error: Payment failed")
})

test("a stat says its direction in words, not only an arrow and a color", () => {
  render(
    <Stat
      label="Errors"
      value="0.4%"
      change={{ value: "0.1%", direction: "up", good: false }}
    />,
  )
  expect(screen.getByText(/Up/).textContent).toBe("Up ")
  expect(document.querySelector("[data-bad]")).toBeTruthy()
})

test("loading marks the region busy and announces once", () => {
  const { container, rerender } = render(
    <Loading loading>
      <span />
    </Loading>,
  )
  expect(document.querySelector('[aria-busy="true"]')).toBeTruthy()
  expect(within(container).getByRole("status").textContent).toBe("Loading…")
  rerender(
    <Loading loading={false}>
      <span>Ready</span>
    </Loading>,
  )
  expect(document.querySelector("[aria-busy]")).toBeNull()
  expect(within(container).getByRole("status").textContent).toBe("")
})
