# Charts: design plan

Step 4 of the owner's plan. UI SDK ships no charts, and a dashboard is the first thing
most apps build, so this is a gap a UI SDK developer hits on day one.

## The set (complete-set rule)

What a developer needs to ship dashboards and reports end to end:

| Item            | What it is                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| `chart`         | The frame every chart shares: title, description, legend, Chart/Table switch, tooltip, scales, palette tokens per skin |
| `line-chart`    | Trend over time; one or more series; area wash for one series; stacked areas |
| `bar-chart`     | Compare categories; vertical or horizontal; grouped or stacked; ranked       |
| `scatter-chart` | Two measures per item; up to three series; nearest-point hover               |
| `heatmap`       | Magnitude on a grid (weekday × hour, day calendar); one hue, scale legend    |
| `segmented-bar` | One whole split into parts, tall (with values) or thin (beside figures)      |
| `sparkline`     | A trend inside text, a table cell or a stat                                  |
| Stat with trend | The existing `stat` gains `delta` direction and a `trend` sparkline          |

No pie or donut. Part-to-whole is a segmented bar (at a glance) or ranked bars (to
compare); the docs say why, so nobody thinks it was forgotten.

## Principles (from the dataviz method, applied to UISet)

- **Form before color.** Every chart's docs start with the job it does.
- **One axis.** No dual-axis option, ever. Two measures → two charts.
- **Color follows the entity.** Series get slots by their place in `series`, so
  isolating or hiding one never repaints the others. There are eight slots; a ninth
  series and beyond draw in the "Other" gray, so fold your tail into one "Other" series.
- **Thin marks.** Bars ≤ 24px with a 4px rounded data end, square at the baseline; 2px
  lines with round joins; markers ≥ 8px with a 2px surface ring; area wash ~10%;
  hairline solid grid and axes, never dashed; 2px surface gap between touching fills.
- **Labels in ink, never series color.** Identity rides a swatch or line key beside it.
  Direct labels only at line ends (≤ 4 series) and bar tips where they fit.
- **Legend for two or more series**, and it doubles as a filter: pressing a legend
  entry isolates or hides a series (toggle buttons, `aria-pressed`).
- **Every chart has a table twin.** A Chart/Table switch shows the same data as a real
  `<table>`. Tooltips enhance; they never gate.
- **Hover and focus show the same thing.** Line/area: a crosshair snaps to the nearest
  x and the tooltip lists every series there. Bars, cells, dots: the mark is the
  target, at least 24px, and lifts on hover.

## Keyboard and screen readers

The SVG is drawing only (`aria-hidden`). Over it sits an HTML layer of hit targets, one
per data position (an x for lines, a bar, a cell, a point), which is what people and
assistive tech use:

- The layer is a `listbox` with one tab stop, from UI SDK's roving focus with a custom
  `move`: arrows follow the chart's direction (`aria-orientation` says which), and in a
  heatmap Up and Down move a row and stop at the edges. Home and End jump. Charts draw
  left to right in every language, so Right is always the next position.
- Each target is an `option` whose name is the full reading: "March 3: Revenue $12,400,
  Costs $8,100". Selecting one pins it (and is a cross-filter hook: `onSelect`).
- Moving announces nothing extra: the option's name is the announcement.
- Targets are the hit areas for the pointer too, so hover and focus share one code path
  and the hit area is the whole band, never a 2px line.

## For agents

Each chart is a UI SDK primitive with an `agent` key: `items` returns the data as rows,
so `query` can answer "what was revenue in March?" without a screenshot, and actions
`isolate`, `showAll`, `showTable` and `select` let an agent drive the view. `select` takes
what people read ("March") before a key. The Chart/Table switch is hidden from agents while
the chart shows, since `showTable` does its job; with the table showing, the chart's actions
are out of reach, so the switch is open to agents as the way back.

## Color per skin (validated, not eyeballed)

Tokens: `--chart-1` … `--chart-8` (categorical), `--chart-seq-1` … `-7` (sequential, one
hue), `--chart-neg`/`--chart-mid`/`--chart-pos` (diverging), plus grid, axis and ink.
Each skin sets them; base.css draws with them.

| Skin, scheme         | Surface   | Palette                                              | Result |
| -------------------- | --------- | ---------------------------------------------------- | ------ |
| Base, light          | `#fdfdff` | reference light set                                  | all gates pass; aqua, yellow, magenta < 3:1 → relief: direct labels + table view |
| Base, dark           | `#0e0f13` | reference dark set                                   | all gates pass, all ≥ 3:1 |
| Studio (dark only)   | `#34383e` | reference dark set                                   | all gates pass; magenta, green < 3:1 → same relief |
| Blueprint (dark only) | `#053d75` | `#9da3ef #73edb1 #fd8537 #f55fad #fed917 #ffc4fe #b2e37e #73c3ff` | adjacent CVD 14.6, normal 18.7; first six all-pairs CVD 9.3, normal 17.3; all ≥ 3:1 |

The gates are the validator's: adjacent pairs, which is what bars and lines need. Pairs
that aren't neighbors can still be close in the reference sets (light pink and orange,
dark green and pink under deutan vision), so charts never lean on color alone: a scatter
chart's series differ in shape, a segmented bar labels its parts, and every chart has its
table. Blueprint's first six clear every pair as well, since its mid-blue paper leaves
less room between colors. `tests/unit/chart-palette.test.ts` measures them, so a re-picked
color that brings back a lookalike pair fails.

Blueprint's set sits above the validator's dark lightness band (0.48–0.67) on purpose:
the band assumes a near-black surface, and on mid-blue paper (L 0.36) colors inside it
fall under 3:1. Contrast is the check the band stands in for, and it passes.

## Look

Charts take the skin. Base: quiet hairlines and the palette. Blueprint: the skin's
white linework for axes, grid and crosshair, and its light colored-pencil set. Studio: the
amber lamp as the crosshair and the sequential ramp.

## Use

```bash
npx shadcn@latest add superzero11/uiset/line-chart superzero11/uiset/bar-chart \
  superzero11/uiset/scatter-chart superzero11/uiset/heatmap \
  superzero11/uiset/segmented-bar superzero11/uiset/sparkline
```

Every chart takes `title` (its name for people and agents), `data`, and accessors.
`format` formats values in tooltips, labels and the table.

```tsx
<LineChart
  title="Revenue and costs"
  description="2026, by month"
  data={months}
  x={(d) => d.month}
  series={[
    { key: "revenue", label: "Revenue", value: (d) => d.revenue },
    { key: "costs", label: "Costs", value: (d) => d.costs },
  ]}
  format={(n) => money.format(n)}
/>

<BarChart title="Revenue by region" data={regions} x={(d) => d.region}
  series={[{ key: "revenue", label: "Revenue", value: (d) => d.revenue }]}
  orientation="horizontal" sort="descending" />

<SegmentedBar title="Traffic sources" parts={[{ key: "search", label: "Search", value: 189000 }, …]} />

<Heatmap title="Sessions by day and hour" data={sessions} rows={days} columns={hours}
  row={(d) => d.day} column={(d) => d.hour} value={(d) => d.sessions} measure="Sessions" />

<ScatterChart title="Deal size and time to close" data={deals} label={(d) => d.name}
  x={(d) => d.days} y={(d) => d.size} xLabel="Days to close" yLabel="Deal size" />

<Stat label="Revenue" value="$91,000" change={{ value: "9.6%", direction: "up" }}
  trend={lastTwelveMonths} />
```

`Sparkline` and `Stat` hold no state, so they render in a Server Component.

```tsx
<LineChart title="Visits by channel" layout="stacked" data={…} x={…} series={…} />
```

- `LineChart`: `layout` is `"line"`, `"area"` (a wash under each line) or `"stacked"`
  (areas to a total, whose readings and table include the total); `zero` keeps zero on
  the axis (default on). Stacks with negative layers stay inside the plot.
- `BarChart`: `orientation` (`"vertical"` columns or `"horizontal"` bars), `layout`
  (`"grouped"` or `"stacked"`), `sort`, `labels`.
- `ScatterChart`: `series` takes up to three groups, each with a `match`.
- `SegmentedBar`: `variant="thin"` for an 8px bar beside its figures.
- `selected` / `onSelect` pin a data position from outside, for cross-filtering a
  dashboard: select a month in one chart, filter the others. Keys are the datum's index
  in `data`, however a bar chart sorts it. `onSelect(key, { source, reason })` says who
  pinned it (`keyboard`, `pointer`, `agent`) and why; when new data drops the pinned
  position, it fires once with `null` and `{ source: "data", reason: "removed" }`. A
  controlled `selected` that the page doesn't change refuses the pin.
- `locale` formats axis ticks, readings and shares; pass it when rendering on a server
  so the server and the browser print the same digits.
- `ChartFrame` is exported for charts of your own: compute the drawing and the data
  positions, and it supplies the rest.

## Keys

| Keys                    | Does                                               |
| ----------------------- | -------------------------------------------------- |
| Tab                     | Into the chart (one stop) and out again            |
| Left, Right (Up, Down)  | The next data position; bar charts on their side use Up and Down |
| Up, Down in a heatmap   | The cell above or below                            |
| Home, End               | The first or last position                         |
| Enter, Space            | Pin the position (and its tooltip); again to unpin |
| Escape                  | Unpin; with nothing pinned, dismiss the tooltip    |

Each position's name is its full reading, so moving is announcing: "Aug: Revenue
$70,000, Costs $52,000".
