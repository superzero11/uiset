// The table and code block in Solid, with React's assertions (tests/unit/data-parts.test.tsx).
import { render, screen, waitFor, within } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/solid/agent"
import { createSignal, flush, For, type ComponentProps } from "solid-js"
import { afterEach, expect, test, vi } from "vitest"
import { CodeBlock, CodeTabs, PackageCommand, packageCommands, packageManager } from "@/solid/src/code-block"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/solid/src/table"
import { settle } from "./solid-bridge"

const agent = createAgent()

afterEach(() => {
  localStorage.clear()
  packageManager.set("npm")
})

function Invoices(props: Partial<ComponentProps<typeof Table>>) {
  return (
    <Table label="Invoices" {...props}>
      <TableCaption>Sent this month</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead align="end">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableHead scope="row">INV-1</TableHead>
          <TableCell>Northwind</TableCell>
          <TableCell align="end">$10</TableCell>
        </TableRow>
        <TableRow>
          <TableHead scope="row">INV-2</TableHead>
          <TableCell label="Buyer">Kestrel</TableCell>
          <TableCell align="end">$20</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

test("a table is a real table in a named region, with scoped headings", async () => {
  render(() => <Invoices />)
  await settle()
  const region = screen.getByRole("region", { name: "Invoices" })
  const table = within(region).getByRole("table")
  expect(table.tagName).toBe("TABLE")
  expect(table.hasAttribute("role")).toBe(false)
  expect(within(table).getAllByRole("columnheader")).toHaveLength(3)
  expect(within(table).getByRole("columnheader", { name: "Amount" }).getAttribute("scope")).toBe("col")
  expect(within(table).getByRole("rowheader", { name: "INV-1" }).getAttribute("scope")).toBe("row")
  expect(within(table).getByRole("columnheader", { name: "Amount" }).getAttribute("data-align")).toBe("end")
  // Without `stack` nothing is copied onto the cells.
  expect(screen.getByText("Northwind").hasAttribute("data-label")).toBe(false)
  const frame = region.closest(".table-frame")!
  expect(frame.hasAttribute("data-stack")).toBe(false)
  expect(frame.hasAttribute("data-sticky-header")).toBe(false)
})

test("a table that stacks states every role and copies each heading onto its cells", async () => {
  render(() => <Invoices stack stickyHeader stickyColumn maxHeight="12rem" minWidth="30rem" />)
  await settle()
  const table = screen.getByRole("table")
  expect(table.getAttribute("role")).toBe("table")
  for (const group of table.querySelectorAll("thead, tbody")) expect(group.getAttribute("role")).toBe("rowgroup")
  for (const tr of table.querySelectorAll("tr")) expect(tr.getAttribute("role")).toBe("row")
  expect(table.querySelector("thead th")!.getAttribute("role")).toBe("columnheader")
  expect(table.querySelector("tbody th")!.getAttribute("role")).toBe("rowheader")
  expect(screen.getByText("Northwind").getAttribute("role")).toBe("cell")
  expect(screen.getByText("Northwind").getAttribute("data-label")).toBe("Customer")
  expect(screen.getByText("$10").getAttribute("data-label")).toBe("Amount")
  expect(screen.getByText("INV-1").getAttribute("data-label")).toBe("Invoice")
  // A cell's own label wins over its column's heading.
  expect(screen.getByText("Kestrel").getAttribute("data-label")).toBe("Buyer")
  const frame = table.closest<HTMLElement>(".table-frame")!
  expect(frame.hasAttribute("data-stack")).toBe(true)
  expect(frame.hasAttribute("data-sticky-header")).toBe(true)
  expect(frame.hasAttribute("data-sticky-column")).toBe(true)
  expect(frame.style.getPropertyValue("--table-max-height")).toBe("12rem")
  expect(frame.style.getPropertyValue("--table-min-width")).toBe("30rem")
})

test("a table that starts or stops stacking tells every part", async () => {
  const [stack, setStack] = createSignal(false)
  render(() => <Invoices stack={stack()} />)
  await settle()
  expect(screen.getByText("Northwind").hasAttribute("role")).toBe(false)
  setStack(true)
  await settle()
  expect(screen.getByRole("table").getAttribute("role")).toBe("table")
  expect(screen.getByText("Northwind").getAttribute("role")).toBe("cell")
  expect(screen.getByText("Northwind").getAttribute("data-label")).toBe("Customer")
  expect(document.querySelector("tbody")!.getAttribute("role")).toBe("rowgroup")
  setStack(false)
  await settle()
  expect(screen.getByText("Northwind").hasAttribute("role")).toBe(false)
  expect(document.querySelector("tbody")!.hasAttribute("role")).toBe(false)
  expect(screen.getByRole("table").hasAttribute("role")).toBe(false)
})

test("rows added later get their labels too", async () => {
  const [rows, setRows] = createSignal(["Ada"])
  render(() => (
    <Table label="Names" stack>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <For each={rows()}>
          {(name) => (
            <TableRow>
              <TableCell>{name}</TableCell>
            </TableRow>
          )}
        </For>
      </TableBody>
    </Table>
  ))
  await settle()
  setRows(["Ada", "Grace"])
  await settle()
  expect(screen.getByText("Grace").getAttribute("data-label")).toBe("Name")
})

const code = `const a = 1\nconst b = 2\n`

test("a code block shows its lines, names its region and copies its code", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  const { container } = render(() => <CodeBlock code={code} title="math.ts" lineNumbers highlight={[2]} />)
  await settle()
  const region = screen.getByRole("group", { name: "math.ts code" })
  const lines = region.querySelectorAll(".code-line")
  expect(lines).toHaveLength(2)
  expect(lines[0]!.hasAttribute("data-highlighted")).toBe(false)
  expect(lines[1]!.hasAttribute("data-highlighted")).toBe(true)
  // The newline sits between the lines, so the text is the code and a marked line can't swallow the next.
  expect(region.querySelector("code")!.textContent).toBe("const a = 1\nconst b = 2")
  expect(lines[1]!.textContent).toBe("const b = 2")
  expect(container.querySelector(".code-block-scroll")!.hasAttribute("data-line-numbers")).toBe(true)
  await userEvent.click(screen.getByRole("button", { name: "Copy math.ts" }))
  expect(writeText).toHaveBeenCalledWith("const a = 1\nconst b = 2")
})

test("a code block can go without its copy button or its head", async () => {
  const [title, setTitle] = createSignal<string | undefined>("math.ts")
  const { container } = render(() => <CodeBlock code={code} title={title()} copy={false} />)
  await settle()
  expect(screen.queryByRole("button")).toBeNull()
  expect(screen.getByText("math.ts")).toBeTruthy()
  setTitle(undefined)
  await settle()
  expect(container.querySelector(".code-block-head")).toBeNull()
  expect(screen.getByRole("group", { name: "Code" })).toBeTruthy()
})

test("new code shows at once, and its lines follow it", async () => {
  const [text, setText] = createSignal(code)
  render(() => <CodeBlock code={text()} title="math.ts" />)
  await settle()
  setText("one\ntwo\nthree")
  await settle()
  const region = screen.getByRole("group", { name: "math.ts code" })
  expect(region.querySelectorAll(".code-line")).toHaveLength(3)
  expect(region.querySelector("code")!.textContent).toBe("one\ntwo\nthree")
})

test("code in a known language shows in its colors, and new code never in the old code's", async () => {
  const [text, setText] = createSignal("const a = 1")
  render(() => <CodeBlock code={text()} title="math.ts" language="ts" />)
  const region = () => screen.getByRole("group", { name: "math.ts code" })
  await waitFor(() => expect(region().querySelector(".code-line span[style]")).toBeTruthy(), { timeout: 4000 })
  expect(region().querySelector("code")!.textContent).toBe("const a = 1")
  // Until the new colors come, the new code shows plain: the old code's colors would show the old text.
  setText("let b = 2")
  flush()
  expect(region().querySelector("code")!.textContent).toBe("let b = 2")
  await waitFor(() => expect(region().querySelector(".code-line span[style]")?.textContent).toBe("let"), { timeout: 4000 })
})

test("code tabs switch the code shown and what Copy copies", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  const onValueChange = vi.fn()
  render(() => (
    <CodeTabs
      label="Framework"
      onValueChange={onValueChange}
      items={[
        { value: "react", label: "React", code: "<Button />" },
        { value: "web", label: "Web Components", code: "<ui-button></ui-button>" },
      ]}
    />
  ))
  await settle()
  expect(screen.getByRole("tablist", { name: "Framework" })).toBeTruthy()
  expect(screen.getByRole("tab", { name: "React" }).getAttribute("aria-selected")).toBe("true")
  expect(screen.getByRole("group", { name: "React code" }).textContent).toBe("<Button />")
  await userEvent.click(screen.getByRole("tab", { name: "Web Components" }))
  await settle()
  expect(onValueChange).toHaveBeenCalledWith("web")
  expect(screen.getByRole("group", { name: "Web Components code" }).textContent).toBe("<ui-button></ui-button>")
  await userEvent.click(screen.getByRole("button", { name: "Copy the Web Components code" }))
  expect(writeText).toHaveBeenCalledWith("<ui-button></ui-button>")
})

test("package commands are written the way each package manager writes them", () => {
  expect(packageCommands({ install: "@uiset/solid" }).map((c) => c.code)).toEqual([
    "npm install @uiset/solid",
    "pnpm add @uiset/solid",
    "yarn add @uiset/solid",
    "bun add @uiset/solid",
  ])
  expect(packageCommands({ run: "shadcn@latest add button" }).map((c) => c.code)[3]).toBe("bunx shadcn@latest add button")
})

test("choosing a package manager changes every command on the page and is remembered", async () => {
  render(() => (
    <>
      <PackageCommand install="@uiset/solid" label="Install manager" />
      <PackageCommand run="shadcn@latest add button" label="Add manager" />
    </>
  ))
  await settle()
  expect(screen.getAllByRole("group", { name: "npm code" })).toHaveLength(2)
  const first = screen.getByRole("tablist", { name: "Install manager" })
  await userEvent.click(within(first).getByRole("tab", { name: "pnpm" }))
  await settle()
  const second = screen.getByRole("tablist", { name: "Add manager" })
  expect(within(second).getByRole("tab", { name: "pnpm" }).getAttribute("aria-selected")).toBe("true")
  const shown = screen.getAllByRole("group", { name: "pnpm code" }).map((r) => r.textContent)
  expect(shown).toEqual(["pnpm add @uiset/solid", "pnpm dlx shadcn@latest add button"])
  expect(localStorage.getItem("uiset-package-manager") ?? "").toContain("pnpm")
})

test("agents see the tabs and the copy button by name, and can switch package manager", async () => {
  render(() => <PackageCommand install="@uiset/solid" />)
  await settle()
  const entries = agent.snapshot().filter((e) => !e.offPage && e.component !== "more")
  for (const entry of entries) expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  expect(entries.map((e) => e.label)).toContain("Package manager")
  const result = await agent.act({ steps: [{ ref: "Package manager", action: "setValue", args: ["yarn"] }] })
  expect(result.ok, result.error?.message).toBe(true)
  await settle()
  expect(screen.getByRole("group", { name: "yarn code" }).textContent).toBe("yarn add @uiset/solid")
})
