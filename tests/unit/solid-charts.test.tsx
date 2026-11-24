import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/solid/agent"
import { createSignal, flush } from "solid-js"
import { expect, test, vi } from "vitest"
import { BarChart } from "@/solid/src/bar-chart"
import { Heatmap } from "@/solid/src/heatmap"
import { LineChart } from "@/solid/src/line-chart"
import { ScatterChart } from "@/solid/src/scatter-chart"
import { SegmentedBar } from "@/solid/src/segmented-bar"
import { Sparkline } from "@/solid/src/sparkline"
import { Stat } from "@/solid/src/stat"
import { settle } from "./solid-bridge"

// The charts in Solid, with React's assertions (tests/unit/charts.test.tsx): the geometry is
// shared, so the readings, keys and table must match React's exactly.

const months = [
  { month: "Jan", revenue: 10, costs: 8 },
  { month: "Feb", revenue: 12, costs: 9 },
  { month: "Mar", revenue: 9, costs: 7 },
]

function Finance() {
  return (
    <LineChart
      title="Revenue and costs"
      data={months}
      x={(d) => d.month}
      series={[
        { key: "revenue", label: "Revenue", value: (d) => d.revenue },
        { key: "costs", label: "Costs", value: (d) => d.costs },
      ]}
      format={(n) => `$${n}`}
    />
  )
}

const readings = (name: string) =>
  within(screen.getByRole("listbox", { name }))
    .getAllByRole("option")
    .map((o) => o.getAttribute("aria-label"))
const press = (el: Element, init?: object) => (fireEvent.click(el, init), flush())
const key = (el: Element, k: string) => (fireEvent.keyDown(el, { key: k }), flush())

test("a line chart is a listbox of its x positions, each read in full", () => {
  render(() => <Finance />)
  expect(readings("Revenue and costs")).toEqual(["Jan: Revenue $10, Costs $8", "Feb: Revenue $12, Costs $9", "Mar: Revenue $9, Costs $7"])
  // The drawing is hidden from assistive tech; the options carry the data.
  expect(document.querySelector(".chart-svg")?.getAttribute("aria-hidden")).toBe("true")
  expect(document.querySelectorAll(".chart-svg .chart-line")).toHaveLength(2)
})

test("pressing a legend entry isolates its series, and pressing it again shows all", () => {
  render(() => <Finance />)
  const costs = screen.getByRole("button", { name: "Costs" })
  press(costs)
  expect(costs.getAttribute("aria-pressed")).toBe("true")
  expect(readings("Revenue and costs")[0]).toBe("Jan: Costs $8")
  press(costs)
  expect(readings("Revenue and costs")[0]).toBe("Jan: Revenue $10, Costs $8")
})

test("the legend works by keyboard too", async () => {
  render(() => <Finance />)
  const costs = screen.getByRole("button", { name: "Costs" })
  costs.focus()
  await userEvent.keyboard("{Enter}")
  await settle()
  expect(costs.getAttribute("aria-pressed")).toBe("true")
  expect(readings("Revenue and costs")[0]).toBe("Jan: Costs $8")
})

test("Table shows the same numbers as a real table", () => {
  render(() => <Finance />)
  press(screen.getByRole("radio", { name: "Table" }))
  const table = screen.getByRole("table", { name: "Revenue and costs" })
  expect(within(table).getAllByRole("row").map((r) => r.textContent)).toEqual(["RevenueCosts", "Jan$10$8", "Feb$12$9", "Mar$9$7"])
})

test("Arrows move between positions and Enter pins one", () => {
  render(() => <Finance />)
  const options = within(screen.getByRole("listbox", { name: "Revenue and costs" })).getAllByRole("option")
  options[0]!.focus()
  key(options[0]!, "ArrowRight")
  expect(document.activeElement).toBe(options[1])
  key(options[1]!, "Enter")
  expect(options[1]!.getAttribute("aria-selected")).toBe("true")
  key(options[1]!, "Escape")
  expect(options[1]!.getAttribute("aria-selected")).toBe("false")
})

test("an option keeps its element, and focus, while the drawing changes under it", () => {
  render(() => <Finance />)
  const options = within(screen.getByRole("listbox", { name: "Revenue and costs" })).getAllByRole("option")
  options[0]!.focus()
  key(options[0]!, "ArrowRight")
  key(options[1]!, "ArrowRight")
  const now = within(screen.getByRole("listbox", { name: "Revenue and costs" })).getAllByRole("option")
  expect(now[2]).toBe(options[2])
  expect(document.activeElement).toBe(options[2])
})

test("agents read every value, isolate a series, pin a point and open the table", async () => {
  const agent = createAgent()
  render(() => <Finance />)
  await settle(0)
  const entry = agent.snapshot().find((item) => item.label === "Revenue and costs" && !item.offPage)
  expect(entry?.actions).toEqual(expect.arrayContaining(["select", "isolate", "showAll", "showTable"]))
  expect(entry?.items?.[0]).toEqual({ value: "Jan", label: "Jan (Revenue: $10, Costs: $8)" })
  const run = async (action: string, ...args: unknown[]) => {
    const result = await agent.act({ steps: [{ ref: entry!.ref, action, args }] })
    await settle(0)
    return result
  }
  let result = await run("isolate", "Revenue")
  expect(result.ok, result.error?.message).toBe(true)
  expect(readings("Revenue and costs")[1]).toBe("Feb: Revenue $12")
  result = await run("isolate", "Profit")
  expect(result.ok).toBe(false)
  expect(result.error?.message).toMatch(/Its series: Revenue, Costs/)
  result = await run("select", "Feb")
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("option", { name: /^Feb/ }).getAttribute("aria-selected")).toBe("true")
  result = await run("showTable", true)
  expect(result.ok, result.error?.message).toBe(true)
  expect(screen.getByRole("table", { name: "Revenue and costs" })).toBeTruthy()
})

test("an agent can name a position by its whole reading, as an option reads", async () => {
  const onSelect = vi.fn()
  render(() => (
    <LineChart title="Visits" data={[{ m: "Jan", v: 1 }, { m: "Feb", v: 2 }]} x={(d) => d.m} series={[{ key: "v", label: "V", value: (d) => d.v }]} onSelect={onSelect} />
  ))
  await settle(0)
  const agent = createAgent()
  const ref = agent.snapshot().find((e) => e.label === "Visits" && !e.offPage)!.ref
  const result = await agent.act({ steps: [{ ref, action: "select", args: ["Feb: V 2"] }] })
  expect(result.ok, result.error?.message).toBe(true)
  expect(onSelect).toHaveBeenLastCalledWith("1", { source: "agent", reason: "command" })
})

test("bars can be ranked, and a stacked reading lists every part and the total", () => {
  render(() => (
    <BarChart
      title="Revenue by region"
      data={[
        { region: "Europe", a: 3, b: 1 },
        { region: "Asia", a: 5, b: 2 },
        { region: "Africa", a: 1, b: 1 },
      ]}
      x={(d) => d.region}
      series={[
        { key: "a", label: "New", value: (d) => d.a },
        { key: "b", label: "Renewals", value: (d) => d.b },
      ]}
      layout="stacked"
      sort="descending"
    />
  ))
  expect(readings("Revenue by region")).toEqual(["Asia: New 5, Renewals 2, total 7", "Europe: New 3, Renewals 1, total 4", "Africa: New 1, Renewals 1, total 2"])
})

test("a segmented bar reads each part's amount and share", () => {
  render(() => (
    <SegmentedBar
      title="Traffic"
      parts={[
        { key: "search", label: "Search", value: 60 },
        { key: "direct", label: "Direct", value: 30 },
        { key: "email", label: "Email", value: 10 },
      ]}
    />
  ))
  expect(readings("Traffic")).toEqual(["Search: 60, 60%", "Direct: 30, 30%", "Email: 10, 10%"])
})

test("a sparkline's name says where the values went, and follows new values", () => {
  const [values, setValues] = createSignal<(number | null)[]>([4, 9, null, 2, 7])
  render(() => <Sparkline label="Signups" values={values()} />)
  expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Signups: from 4 to 7, low 2, high 9")
  setValues([1, 3])
  flush()
  expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Signups: from 1 to 3, low 1, high 3")
})

test("in a heatmap, Down moves by a row and Right by a cell", () => {
  const rows = ["Mon", "Tue"]
  const columns = ["9h", "12h", "15h"]
  render(() => (
    <Heatmap
      title="Sessions by day"
      data={rows.flatMap((r, i) => columns.map((c, j) => ({ r, c, v: i * 3 + j })))}
      rows={rows}
      columns={columns}
      row={(d) => d.r}
      column={(d) => d.c}
      value={(d) => d.v}
      measure="Sessions"
    />
  ))
  const options = within(screen.getByRole("listbox", { name: "Sessions by day" })).getAllByRole("option")
  expect(options[4]!.getAttribute("aria-label")).toBe("Tue, 12h: Sessions 4")
  options[0]!.focus()
  key(options[0]!, "ArrowDown")
  expect(document.activeElement).toBe(options[3])
  key(options[3]!, "ArrowRight")
  expect(document.activeElement).toBe(options[4])
})

const coordinates = () =>
  [...document.querySelectorAll(".chart-svg path, .chart-svg line, .chart-svg circle, .chart-svg rect")]
    .flatMap((el) => [...el.attributes].filter((a) => /^(d|x|y|x1|x2|y1|y2|cx|cy|width|height)$/.test(a.name)))
    .map((a) => a.value)

test("a chart with no data, or a last month nobody reported, draws no NaN", () => {
  const { unmount } = render(() => <LineChart title="Nothing yet" data={[] as { m: string; v: number }[]} x={(d) => d.m} series={[{ key: "v", label: "V", value: (d) => d.v }]} />)
  expect(within(screen.getByRole("listbox", { name: "Nothing yet" })).queryAllByRole("option")).toHaveLength(0)
  unmount()
  render(() => (
    <LineChart
      title="Pending"
      data={[
        { m: "Jan", a: 1, b: 2 },
        { m: "Feb", a: null, b: null },
      ]}
      x={(d) => d.m}
      series={[
        { key: "a", label: "A", value: (d) => d.a },
        { key: "b", label: "B", value: (d) => d.b },
      ]}
    />
  ))
  expect(coordinates().length).toBeGreaterThan(0)
  expect(coordinates().some((v) => /NaN|Infinity/.test(v))).toBe(false)
})

test("stacked areas with a negative layer stay inside the plot", () => {
  render(() => (
    <LineChart
      title="Net"
      layout="stacked"
      height={240}
      data={[
        { m: "Jan", a: 100, b: 60, c: -50 },
        { m: "Feb", a: 80, b: 40, c: -30 },
      ]}
      x={(d) => d.m}
      series={[
        { key: "a", label: "A", value: (d) => d.a },
        { key: "b", label: "B", value: (d) => d.b },
        { key: "c", label: "C", value: (d) => d.c },
      ]}
    />
  ))
  const ys = [...document.querySelectorAll(".chart-line, .chart-area")].flatMap((el) => [...(el.getAttribute("d") ?? "").matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2])))
  expect(ys.length).toBeGreaterThan(0)
  expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
  expect(Math.max(...ys)).toBeLessThanOrEqual(240)
})

test("a ranked bar's key is its place in data, so onSelect names the right datum", () => {
  const onSelect = vi.fn()
  render(() => (
    <BarChart
      title="Ranked"
      data={[
        { r: "Europe", v: 3 },
        { r: "Asia", v: 9 },
      ]}
      x={(d) => d.r}
      series={[{ key: "v", label: "V", value: (d) => d.v }]}
      sort="descending"
      onSelect={onSelect}
    />
  ))
  const europe = screen.getByRole("option", { name: /^Europe/ })
  europe.focus()
  key(europe, "Enter")
  expect(onSelect).toHaveBeenLastCalledWith("0", { source: "keyboard", reason: "toggle" })
})

test("agents name a position by its reading before its key", async () => {
  const onSelect = vi.fn()
  render(() => (
    <BarChart
      title="Places"
      data={[
        { r: "1", v: 1 },
        { r: "2", v: 3 },
        { r: "3", v: 2 },
      ]}
      x={(d) => d.r}
      series={[{ key: "v", label: "V", value: (d) => d.v }]}
      sort="descending"
      onSelect={onSelect}
    />
  ))
  await settle(0)
  const agent = createAgent()
  const ref = agent.snapshot().find((e) => e.label === "Places" && !e.offPage)!.ref
  const result = await agent.act({ steps: [{ ref, action: "select", args: ["1"] }] })
  expect(result.ok).toBe(true)
  // Reading "1" is data[0]: key "0", though key "1" (data[1]) sorts first.
  expect(onSelect).toHaveBeenLastCalledWith("0", { source: "agent", reason: "command" })
})

test("new data that drops the pinned position lets the pin go, and says so", async () => {
  const onSelect = vi.fn()
  const all = [
    { m: "Jan", v: 1 },
    { m: "Feb", v: 2 },
    { m: "Mar", v: 3 },
  ]
  const [data, setData] = createSignal(all)
  render(() => <LineChart title="Visits" data={data()} x={(d) => d.m} series={[{ key: "v", label: "V", value: (d) => d.v }]} onSelect={onSelect} />)
  const mar = screen.getByRole("option", { name: /^Mar/ })
  mar.focus()
  key(mar, "Enter")
  expect(screen.getByRole("option", { name: /^Mar/ }).getAttribute("aria-selected")).toBe("true")
  setData(all.slice(0, 2))
  flush()
  await waitFor(() => expect(onSelect).toHaveBeenLastCalledWith(null, { source: "data", reason: "removed" }))
  expect(onSelect).toHaveBeenCalledTimes(2)
  expect(document.querySelector(".chart-crosshair")).toBe(null)
})

test("with the table showing, the Chart/Table switch is open to agents", async () => {
  render(() => <LineChart title="Visits" data={[{ m: "Jan", v: 1 }]} x={(d) => d.m} series={[{ key: "v", label: "V", value: (d) => d.v }]} />)
  const radios = screen.getByRole("radiogroup", { name: "Show Visits as" })
  expect(radios.closest("[data-agent-hidden]")).not.toBe(null)
  press(screen.getByRole("radio", { name: "Table" }))
  await waitFor(() => expect(screen.getByRole("radiogroup", { name: "Show Visits as" }).closest("[data-agent-hidden]")).toBe(null))
})

test("aria-orientation says which arrows move, and a heatmap stops at its edges", () => {
  render(() => (
    <>
      <BarChart title="Sideways" orientation="horizontal" data={[{ r: "A", v: 1 }]} x={(d) => d.r} series={[{ key: "v", label: "V", value: (d) => d.v }]} />
      <Heatmap
        title="Edges"
        data={[0, 1].flatMap((r) => [0, 1].map((c) => ({ r: `r${r}`, c: `c${c}`, v: r + c })))}
        rows={["r0", "r1"]}
        columns={["c0", "c1"]}
        row={(d) => d.r}
        column={(d) => d.c}
        value={(d) => d.v}
        measure="Count"
      />
    </>
  ))
  expect(screen.getByRole("listbox", { name: "Sideways" }).getAttribute("aria-orientation")).toBe("vertical")
  const grid = screen.getByRole("listbox", { name: "Edges" })
  expect(grid.hasAttribute("aria-orientation")).toBe(false)
  const cells = within(grid).getAllByRole("option")
  cells[2]!.focus()
  key(cells[2]!, "ArrowDown")
  expect(document.activeElement).toBe(cells[2])
  key(cells[2]!, "ArrowLeft")
  expect(document.activeElement).toBe(cells[2])
  key(cells[2]!, "ArrowRight")
  expect(document.activeElement).toBe(cells[3])
  key(cells[3]!, "ArrowRight")
  expect(document.activeElement).toBe(cells[3])
})

test("Escape dismisses a tooltip shown by focus, with nothing pinned", () => {
  render(() => <Finance />)
  const first = within(screen.getByRole("listbox", { name: "Revenue and costs" })).getAllByRole("option")[0]!
  first.focus()
  flush()
  expect(document.querySelector(".chart-tooltip")).not.toBeNull()
  key(first, "Escape")
  expect(document.querySelector(".chart-tooltip")).toBeNull()
})

test("bar sparklines of negative values stay inside their box", () => {
  render(() => <Sparkline label="Losses" variant="bar" values={[-3, -8, -1]} height={28} />)
  const rects = [...document.querySelectorAll(".sparkline rect")]
  expect(rects.length).toBe(3)
  for (const r of rects) {
    expect(Number(r.getAttribute("y"))).toBeGreaterThanOrEqual(0)
    expect(Number(r.getAttribute("y")) + Number(r.getAttribute("height"))).toBeLessThanOrEqual(28)
  }
})

test("numbers follow the locale given, on the axis and in readings", () => {
  render(() => (
    <LineChart
      title="Umsatz"
      locale="de-DE"
      data={[
        { m: "Jan", v: 1234.5 },
        { m: "Feb", v: 2500 },
      ]}
      x={(d) => d.m}
      series={[{ key: "v", label: "Umsatz", value: (d) => d.v }]}
    />
  ))
  expect(readings("Umsatz")[0]).toBe("Jan: Umsatz 1.234,5")
  expect([...document.querySelectorAll("[data-axis=y] text")].map((t) => t.textContent)).toContain("1.000")
})

test("a series that's gone isn't isolated: new series show again", () => {
  const data = [
    { m: "Jan", a: 1, b: 2 },
    { m: "Feb", a: 2, b: 1 },
  ]
  const both = [
    { key: "a", label: "A", value: (d: (typeof data)[number]) => d.a },
    { key: "b", label: "B", value: (d: (typeof data)[number]) => d.b },
  ]
  const [series, setSeries] = createSignal(both)
  const { container } = render(() => <LineChart title="Two" data={data} x={(d) => d.m} series={series()} />)
  press(screen.getByRole("button", { name: "B" }))
  expect(container.querySelectorAll(".chart-line")).toHaveLength(1)
  setSeries(both.slice(0, 1))
  flush()
  expect(container.querySelectorAll(".chart-line")).toHaveLength(1)
  expect(screen.getByRole("option", { name: /^Jan/ }).getAttribute("aria-label")).toMatch(/^Jan: A 1/)
})

test("a scatter chart reads each point's two measures", () => {
  render(() => (
    <ScatterChart
      title="Deals"
      data={[
        { name: "Acme", size: 10, days: 30 },
        { name: "Globex", size: 4, days: 12 },
      ]}
      label={(d) => d.name}
      x={(d) => d.size}
      y={(d) => d.days}
      xLabel="Size"
      yLabel="Days"
    />
  ))
  // Left to right: the smaller deal first.
  expect(readings("Deals").map((r) => r!.split(":")[0])).toEqual(["Globex", "Acme"])
})

test("a stat says its direction in words, not only an arrow and a color, and draws its trend", () => {
  render(() => <Stat label="Revenue" value="$42,000" change={{ value: "12%", direction: "down", period: "vs last month" }} trend={[3, 5, 4]} />)
  const change = document.querySelector(".stat-change")!
  expect(change.textContent).toBe("Down 12% vs last month")
  expect(change.hasAttribute("data-bad")).toBe(true)
  expect(screen.getByRole("img", { name: /^Revenue trend/ })).toBeTruthy()
})
