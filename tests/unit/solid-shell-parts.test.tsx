import { render, screen, within } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/solid/agent"
import { createSignal, flush } from "solid-js"
import { afterEach, expect, test, vi } from "vitest"
import { Alert, type AlertTone } from "@/solid/src/alert"
import { Breadcrumbs } from "@/solid/src/breadcrumbs"
import { CopyButton } from "@/solid/src/copy-button"
import { SearchField } from "@/solid/src/search-field"
import { Loading } from "@/solid/src/skeleton"
import { Stepper } from "@/solid/src/stepper"
import { Toaster, toast } from "@/solid/src/toast"
import { UISet } from "@/solid/src/uiset"
import { settle } from "./solid-bridge"

// UISet's own small parts in Solid, with React's assertions (tests/unit/shell.test.tsx and
// toast.agent.test.tsx). The app shell and the stat come with their kits.

const tick = () => settle(0)
afterEach(() => toast.dismiss?.())

test("breadcrumbs mark the current page and link the rest", () => {
  render(() => <Breadcrumbs items={[{ label: "Projects", href: "/p" }, { label: "Atlas" }]} />)
  expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Projects" })).toBeTruthy()
  expect(screen.getByText("Atlas").getAttribute("aria-current")).toBe("page")
})

test("the current page isn't a link even when it has an address", () => {
  render(() => <Breadcrumbs label="Path" items={[{ label: "Projects", href: "/p" }, { label: "Atlas", href: "/p/atlas" }]} />)
  expect(screen.queryByRole("link", { name: "Atlas" })).toBeNull()
  expect(screen.getByText("Atlas").getAttribute("aria-current")).toBe("page")
  expect(screen.getByRole("navigation", { name: "Path" }).querySelectorAll(".breadcrumbs-separator")).toHaveLength(1)
})

test("a linear stepper marks the current step and locks the ones ahead, following its value", async () => {
  const onValueChange = vi.fn()
  const [value, setValue] = createSignal("b")
  render(() => (
    <Stepper
      steps={[
        { value: "a", label: "Account" },
        { value: "b", label: "Details", description: "Name and region" },
        { value: "c", label: "Review" },
      ]}
      value={value()}
      onValueChange={onValueChange}
    />
  ))
  await tick()
  expect(screen.getByRole("button", { name: /Details/ }).getAttribute("aria-current")).toBe("step")
  expect(screen.getByRole("button", { name: /Details/ }).textContent).toContain("Details, Name and region")
  expect(screen.getByRole("button", { name: /Account/ }).textContent).toContain("(done)")
  expect(screen.getByRole("button", { name: /Review/ }).hasAttribute("disabled")).toBe(true)
  await userEvent.click(screen.getByRole("button", { name: /Account/ }))
  expect(onValueChange).toHaveBeenCalledWith("a")
  setValue("c")
  flush()
  expect(screen.getByRole("button", { name: /Review/ }).getAttribute("aria-current")).toBe("step")
  expect(screen.getByRole("button", { name: /Review/ }).hasAttribute("disabled")).toBe(false)
})

test("search focuses with / and clears with its button", async () => {
  render(() => (
    <>
      <button>Elsewhere</button>
      <SearchField label="Search docs" />
    </>
  ))
  await tick()
  const box = screen.getByRole("searchbox", { name: "Search docs" }) as HTMLInputElement
  screen.getByRole("button", { name: "Elsewhere" }).focus()
  await userEvent.keyboard("/")
  expect(document.activeElement).toBe(box)
  await userEvent.type(box, "tokens")
  await tick()
  await userEvent.click(screen.getByRole("button", { name: "Clear search docs" }))
  expect(box.value).toBe("")
  expect(document.activeElement).toBe(box)
})

test("an agent sees one named search box and can clear it", async () => {
  const agent = createAgent()
  render(() => <SearchField label="Search docs" defaultValue="tokens" />)
  await tick()
  const entries = agent.snapshot().filter((e) => !e.offPage)
  expect(entries.map((e) => e.label)).toEqual(["Search docs"])
  expect((await agent.act({ steps: [{ ref: "Search docs", action: "clear" }] })).ok).toBe(true)
  expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("")
})

test("copy writes to the clipboard and says so", async () => {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  render(() => <CopyButton value="npx shadcn add x" label="Copy command" />)
  await userEvent.click(screen.getByRole("button", { name: "Copy command" }))
  await tick()
  expect(writeText).toHaveBeenCalledWith("npx shadcn add x")
  expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy()
})

test("copy buttons that share a page can carry fuller names", () => {
  render(() => (
    <>
      <CopyButton value="a" aria-label="Copy app.tsx" />
      <CopyButton value="b" aria-label="Copy styles.css" />
    </>
  ))
  expect(screen.getByRole("button", { name: "Copy app.tsx" })).toBeTruthy()
  expect(screen.getByRole("button", { name: "Copy styles.css" })).toBeTruthy()
})

test("alerts name their tone, interrupt only when urgent, and can be dismissed", async () => {
  const onDismiss = vi.fn()
  const [alert, setAlert] = createSignal<{ tone: AlertTone; title: string; urgent?: boolean; dismiss?: () => void }>({
    tone: "warning",
    title: "Card expires soon",
    dismiss: onDismiss,
  })
  render(() => <Alert tone={alert().tone} title={alert().title} urgent={alert().urgent} onDismiss={alert().dismiss} />)
  expect(screen.queryByRole("alert")).toBeNull()
  expect(screen.getByText(/Warning:/)).toBeTruthy()
  await userEvent.click(screen.getByRole("button", { name: "Dismiss" }))
  expect(onDismiss).toHaveBeenCalled()
  setAlert({ tone: "danger", title: "Payment failed", urgent: true })
  flush()
  expect(screen.getByRole("alert").textContent).toContain("Error: Payment failed")
  expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull()
})

test("an alert without a title says its tone before its text", () => {
  render(() => <Alert tone="success">Saved to your library.</Alert>)
  expect(screen.getByText(/Success:/).parentElement!.textContent).toBe("Success: Saved to your library.")
})

test("loading marks the region busy and announces once", () => {
  const [loading, setLoading] = createSignal(true)
  const { container } = render(() => (
    <Loading loading={loading()}>
      <span>Ready</span>
    </Loading>
  ))
  expect(document.querySelector('[aria-busy="true"]')).toBeTruthy()
  expect(within(container).getByRole("status").textContent).toBe("Loading…")
  setLoading(false)
  flush()
  expect(document.querySelector("[aria-busy]")).toBeNull()
  expect(within(container).getByRole("status").textContent).toBe("")
})

test("an agent sees a toast while it shows, and presses its action", async () => {
  const agent = createAgent()
  render(() => (
    <UISet>
      <Toaster />
    </UISet>
  ))
  await settle()
  expect(agent.snapshot().filter((e) => e.component === "toast" && !e.offPage)).toEqual([])
  const undo = vi.fn()
  toast("Message archived", { action: { label: "Undo", onAction: undo } })
  await settle()
  const seen = agent.snapshot().find((e) => e.component === "toast" && !e.offPage)
  expect(seen?.label).toBe("Message archived")
  const result = await agent.act({ steps: [{ ref: seen!.ref, action: "press", args: ["Undo"] }] })
  expect(result.ok, JSON.stringify(result)).toBe(true)
  expect(undo).toHaveBeenCalledOnce()
})
