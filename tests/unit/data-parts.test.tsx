import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/react/agent"
import { afterEach, expect, test, vi } from "vitest"
import { Avatar, AvatarFallback } from "@/registry/uiset/ui/avatar"
import { AvatarGroup } from "@/registry/uiset/ui/avatar-group"
import { CountBadge } from "@/registry/uiset/ui/badge"
import { CodeBlock, CodeTabs, PackageCommand, packageCommands, packageManager } from "@/registry/uiset/ui/code-block"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/registry/uiset/ui/table"

const agent = createAgent()
const tick = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

afterEach(() => {
  localStorage.clear()
  act(() => void packageManager.set("npm"))
})

const people = ["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Hedy Lamarr", "Annie Easley"]
const avatars = people.map((name) => (
  <Avatar key={name} role="img" aria-label={name}>
    <AvatarFallback>{name[0]}</AvatarFallback>
  </Avatar>
))

test("an avatar group is named, shows up to max, and counts the rest in words", () => {
  render(<AvatarGroup label="Reviewers" max={3}>{avatars}</AvatarGroup>)
  const group = screen.getByRole("group", { name: "Reviewers" })
  expect(within(group).getAllByRole("img")).toHaveLength(4)
  expect(within(group).queryByRole("img", { name: "Hedy Lamarr" })).toBeNull()
  expect(within(group).getByRole("img", { name: "2 more" }).textContent).toBe("+2")
})

test("an avatar group with no limit shows everyone, and total counts people it wasn't given", () => {
  const { rerender } = render(<AvatarGroup label="Team">{avatars}</AvatarGroup>)
  expect(screen.getAllByRole("img")).toHaveLength(5)
  expect(screen.queryByRole("img", { name: /more/ })).toBeNull()
  rerender(
    <AvatarGroup label="Team" total={128} moreLabel={(count) => `and ${count} others`}>
      {avatars.slice(0, 2)}
    </AvatarGroup>,
  )
  expect(screen.getByRole("img", { name: "and 126 others" }).textContent).toBe("+126")
})

test("a count badge shows the count, caps it, hides at zero, and reads its label", () => {
  const { rerender, container } = render(<CountBadge count={3} label="3 unread">Inbox</CountBadge>)
  const count = () => container.querySelector(".count-badge-count")
  expect(count()!.textContent).toBe("3")
  expect(count()!.getAttribute("aria-hidden")).toBe("true")
  expect(screen.getByText("3 unread").className).toBe("uiset-visually-hidden")
  rerender(<CountBadge count={128}>Inbox</CountBadge>)
  expect(count()!.textContent).toBe("99+")
  rerender(<CountBadge count={128} max={999}>Inbox</CountBadge>)
  expect(count()!.textContent).toBe("128")
  rerender(<CountBadge count={0} label="0 unread">Inbox</CountBadge>)
  expect(count()).toBeNull()
  expect(screen.queryByText("0 unread")).toBeNull()
  rerender(<CountBadge count={0} showZero>Inbox</CountBadge>)
  expect(count()!.textContent).toBe("0")
  rerender(<CountBadge count={1} dot>Inbox</CountBadge>)
  expect(count()!.textContent).toBe("")
  expect(count()!.hasAttribute("data-dot")).toBe(true)
})

function Invoices(props: Partial<React.ComponentProps<typeof Table>>) {
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

test("a table is a real table in a named region, with scoped headings", () => {
  render(<Invoices />)
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
  const { rerender } = render(<Invoices stack stickyHeader stickyColumn maxHeight="12rem" minWidth="30rem" />)
  await tick()
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
  rerender(<Invoices stack />)
})

test("rows added later get their labels too", async () => {
  function Growing({ rows }: { rows: string[] }) {
    return (
      <Table label="Names" stack>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((name) => (
            <TableRow key={name}>
              <TableCell>{name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }
  const { rerender } = render(<Growing rows={["Ada"]} />)
  await tick()
  rerender(<Growing rows={["Ada", "Grace"]} />)
  await tick()
  expect(screen.getByText("Grace").getAttribute("data-label")).toBe("Name")
})

const code = `const a = 1\nconst b = 2\n`

test("a code block shows its lines, names its region and copies its code", async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
  const { container } = render(<CodeBlock code={code} title="math.ts" lineNumbers highlight={[2]} />)
  await tick()
  const region = screen.getByRole("group", { name: "math.ts code" })
  const lines = region.querySelectorAll(".code-line")
  expect(lines).toHaveLength(2)
  expect(lines[0]!.hasAttribute("data-highlighted")).toBe(false)
  expect(lines[1]!.hasAttribute("data-highlighted")).toBe(true)
  // The newline sits between the lines, so the text is the code and a marked line can't swallow the next.
  expect(region.querySelector("code")!.textContent).toBe("const a = 1\nconst b = 2")
  expect(lines[1]!.textContent).toBe("const b = 2")
  expect(container.querySelector(".code-block-scroll")!.hasAttribute("data-line-numbers")).toBe(true)
  await user.click(screen.getByRole("button", { name: "Copy math.ts" }))
  expect(writeText).toHaveBeenCalledWith("const a = 1\nconst b = 2")
  writeText.mockRestore()
})

test("a code block can go without its copy button or its head", () => {
  const { container, rerender } = render(<CodeBlock code={code} title="math.ts" copy={false} />)
  expect(screen.queryByRole("button")).toBeNull()
  expect(screen.getByText("math.ts")).toBeTruthy()
  rerender(<CodeBlock code={code} copy={false} />)
  expect(container.querySelector(".code-block-head")).toBeNull()
  expect(screen.getByRole("group", { name: "Code" })).toBeTruthy()
})

test("code tabs switch the code shown and what Copy copies", async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
  const onValueChange = vi.fn()
  render(
    <CodeTabs
      label="Framework"
      onValueChange={onValueChange}
      items={[
        { value: "react", label: "React", code: "<Button />" },
        { value: "web", label: "Web Components", code: "<ui-button></ui-button>" },
      ]}
    />,
  )
  await tick()
  expect(screen.getByRole("tablist", { name: "Framework" })).toBeTruthy()
  expect(screen.getByRole("tab", { name: "React" }).getAttribute("aria-selected")).toBe("true")
  expect(screen.getByRole("group", { name: "React code" }).textContent).toBe("<Button />")
  await user.click(screen.getByRole("tab", { name: "Web Components" }))
  await tick()
  expect(onValueChange).toHaveBeenCalledWith("web")
  expect(screen.getByRole("group", { name: "Web Components code" }).textContent).toBe("<ui-button></ui-button>")
  await user.click(screen.getByRole("button", { name: "Copy the Web Components code" }))
  expect(writeText).toHaveBeenCalledWith("<ui-button></ui-button>")
  writeText.mockRestore()
})

test("package commands are written the way each package manager writes them", () => {
  expect(packageCommands({ install: "@uiset/web" }).map((c) => c.code)).toEqual([
    "npm install @uiset/web",
    "pnpm add @uiset/web",
    "yarn add @uiset/web",
    "bun add @uiset/web",
  ])
  expect(packageCommands({ install: "vitest", dev: true }).map((c) => c.code)).toEqual([
    "npm install -D vitest",
    "pnpm add -D vitest",
    "yarn add -D vitest",
    "bun add -D vitest",
  ])
  expect(packageCommands({ run: "shadcn@latest add button" }).map((c) => c.code)).toEqual([
    "npx shadcn@latest add button",
    "pnpm dlx shadcn@latest add button",
    "yarn dlx shadcn@latest add button",
    "bunx shadcn@latest add button",
  ])
})

test("choosing a package manager changes every command on the page and is remembered", async () => {
  const user = userEvent.setup()
  render(
    <>
      <PackageCommand install="@uiset/web" label="Install manager" />
      <PackageCommand run="shadcn@latest add button" label="Add manager" />
    </>,
  )
  await tick()
  expect(screen.getAllByRole("group", { name: "npm code" })).toHaveLength(2)
  const first = screen.getByRole("tablist", { name: "Install manager" })
  await user.click(within(first).getByRole("tab", { name: "pnpm" }))
  await tick()
  const second = screen.getByRole("tablist", { name: "Add manager" })
  expect(within(second).getByRole("tab", { name: "pnpm" }).getAttribute("aria-selected")).toBe("true")
  const shown = screen.getAllByRole("group", { name: "pnpm code" }).map((r) => r.textContent)
  expect(shown).toEqual(["pnpm add @uiset/web", "pnpm dlx shadcn@latest add button"])
  expect(localStorage.getItem("uiset-package-manager") ?? "").toContain("pnpm")
})

test("agents see the tabs and the copy button by name, and can switch package manager", async () => {
  render(<PackageCommand install="@uiset/web" />)
  await tick()
  const entries = agent.snapshot().filter((e) => !e.offPage && e.component !== "more")
  for (const entry of entries) expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  expect(entries.map((e) => e.label)).toContain("Package manager")
  const result = await agent.act({ steps: [{ ref: "Package manager", action: "setValue", args: ["yarn"] }] })
  expect(result.ok, result.error?.message).toBe(true)
  await tick()
  expect(screen.getByRole("group", { name: "yarn code" }).textContent).toBe("yarn add @uiset/web")
})
