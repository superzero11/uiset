# Svelte

UISet works in Svelte 5 through its Web Components build, `@uiset/web`: one module that
defines the `<uiset-*>` elements and one stylesheet with every skin. It's built on UI SDK,
whose own `<ui-*>` elements it dresses. This page covers what is specific to Svelte: setup,
passing data with runes, events, skins, UI SDK's Svelte components and server rendering.
Every element's attributes, properties and events are in
[Web Components](./web-components.md).

This page describes `@uiset/web` 0.3.0 or later.

## Install

```bash
npm install @uiset/web @ui-sdk/web
```

With npm this resolves `@ui-sdk/web` and `@ui-sdk/core` to `0.1.0-beta.13`, the exact
version UISet pins. pnpm takes UI SDK's `latest` tag, the same beta today, which moves on with
UI SDK's next one, so name the versions:

```bash
pnpm add @uiset/web @ui-sdk/web@0.1.0-beta.13 @ui-sdk/core@0.1.0-beta.13
```

`shiki` is optional: with it, code in chats is colored; without it the app still builds and
code blocks are plain.

Svelte needs no configuration for the tags. Vite's `svelte-ts` template works as it comes.

## A first screen

Import the UI SDK elements you use, then UISet's module and stylesheet, before the app
mounts. `uiset.css` already includes UI SDK's own styles.

```ts
// src/main.ts
import { mount } from "svelte"
import "@ui-sdk/web/button"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/select"
import "@ui-sdk/web/switch"
import "@uiset/web"
import "@uiset/web/uiset.css"
import "./app.css"
import App from "./App.svelte"

const app = mount(App, { target: document.getElementById("app")! })

export default app
```

```svelte
<script lang="ts">
  const steps = [
    { value: "account", label: "Account" },
    { value: "details", label: "Details" },
    { value: "review", label: "Review" },
  ]
  let step = $state("details")
  let emails = $state(false)
</script>

<uiset-root skin="base">
  <ui-button><button>Save</button></ui-button>
  <ui-button><button data-variant="outline">Cancel</button></ui-button>

  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label>
    <ui-switch oncheckedchange={(e: CustomEvent<{ value: boolean }>) => (emails = e.detail.value)}>
      <ui-switch-thumb></ui-switch-thumb>
    </ui-switch>
    Email me
  </label>

  <uiset-stepper
    label="Setup progress"
    {steps}
    value={step}
    onvaluechange={(e: CustomEvent<{ value: string }>) => (step = e.detail.value)}
  ></uiset-stepper>

  <uiset-stat label="Revenue" value="$48,200" change="12%" direction="up" period="vs last month"></uiset-stat>

  <p>Step: {step}. Emails: {emails ? "on" : "off"}.</p>
</uiset-root>
```

`<uiset-root>` holds the skin; everything inside takes it.

Svelte's accessibility checks don't know the elements. A `<label>` around `<ui-switch>`
warns that it has no control, though UI SDK names the switch from that label when it
upgrades; and the `<button>` inside `<ui-select-trigger>` warns that it has no text, though
`<ui-select-value>` fills it. The `svelte-ignore` comment above quiets the first, and
`a11y_consider_explicit_label` the second.

## Data in

Write arrays, objects and functions as ordinary attributes in braces. With the elements
defined before the app mounts (the imports in `main.ts` see to that), Svelte sets them as
properties, and text such as `label` as attributes.

```svelte
<script lang="ts">
  import type { UISetDataGridEvents } from "@uiset/web"
  import { orders, type Order } from "./data"

  let rows = $state.raw<Order[]>(orders)
  const columns = [
    { id: "customer", header: "Customer", value: (o: Order) => o.customer, editable: true },
    { id: "plan", header: "Plan", value: (o: Order) => o.plan, options: ["Free", "Pro", "Team"] },
    { id: "seats", header: "Seats", type: "number", value: (o: Order) => o.seats, editable: true },
  ]
  const getRowId = (o: Order) => o.id

  let query = $state("")
  let selected = $state.raw<string[]>([])

  type CellEdit = UISetDataGridEvents<Order>["celledit"]

  function onCellEdit(event: CellEdit) {
    const { rowId, column, value } = event.detail
    if (column === "seats" && Number(value) < 1) return event.preventDefault()
    rows = rows.map((o) => (o.id === rowId ? { ...o, [column]: value } : o))
  }

  function addOrder() {
    rows = [...rows, { id: `o${rows.length + 1}`, customer: "New customer", plan: "Free", seats: 1 }]
  }
</script>

<uiset-search-field
  label="Search orders"
  placeholder="Search orders…"
  value={query}
  onvaluechange={(e: CustomEvent<{ value: string }>) => (query = e.detail.value)}
></uiset-search-field>

<uiset-data-grid
  label="Orders"
  selectable
  editable
  height="16rem"
  {rows}
  {columns}
  {getRowId}
  {query}
  {selected}
  onselectedchange={(e: CustomEvent<{ value: string[] }>) => (selected = e.detail.value)}
  oncelledit={onCellEdit}
></uiset-data-grid>
```

Functions are properties too. A chart takes its data and the functions that read it, and
`$derived` feeds a sparkline:

```svelte
<script lang="ts">
  import { months, type Month } from "./data"

  let data = $state.raw<Month[]>(months)
  const x = (d: Month) => d.month
  const series = [
    { key: "revenue", label: "Revenue", value: (d: Month) => d.revenue },
    { key: "costs", label: "Costs", value: (d: Month) => d.costs },
  ]
  const format = (n: number) => `$${n / 1000}k`
  let pinned = $state<string | null>(null)
  const revenue = $derived(data.map((d) => d.revenue))
</script>

<uiset-line-chart
  label="Revenue"
  description="By month"
  {data}
  {x}
  {series}
  {format}
  selected={pinned}
  onselect={(e: CustomEvent<{ value: string | null }>) => (pinned = e.detail.value)}
></uiset-line-chart>
<uiset-sparkline label="Revenue, five months" values={revenue}></uiset-sparkline>
```

Five things to know:

- **Replace arrays, don't change them in place.** An element redraws when its property is
  set again. `rows.push(…)` on deep `$state` changes your state and leaves the grid as it
  was; `rows = [...rows, row]` redraws it. `$state.raw` fits: the element gets your plain
  array, and only replacing it counts as a change.
- **Define the elements before Svelte renders them.** On a page that hydrated before the
  module loaded, arrays still arrived as properties and functions did not: the chart had no
  `x` and drew nothing.
- **A value set as a property leaves no attribute.** `<ui-select-item value="studio">` has
  no `value` attribute in the page, so don't select on it in CSS or tests.
- **An attribute that turns something on** (`selectable`, `editable`, `toolbar`, the
  root's `sound`) is written bare, as above, or given a boolean. `false` turns it off
  (0.3.0 or later):

```svelte
<uiset-data-grid toolbar={flags.toolbar}></uiset-data-grid>
```

- **A list can be text or an array** (0.3.0 or later). A sparkline's `values` and a stat's
  `trend` take either; an empty place in the text is a gap:

```svelte
<uiset-sparkline label="Trend" values="4,6,,8"></uiset-sparkline>
<uiset-sparkline label="Trend" values={[4, 6, null, 8]}></uiset-sparkline>
<uiset-stat label="Revenue" value="$48,200" trend="31,35,33,40,48"></uiset-stat>
```

## Events out

The elements report changes as DOM events, named in lowercase, with the new value in
`event.detail`. Listen with `on` and the event's name:

| Element                | Listener           | `event.detail`                                  |
| ---------------------- | ------------------ | ----------------------------------------------- |
| `<ui-switch>`          | `oncheckedchange`  | `value`: on or off                              |
| `<ui-select>`          | `onvaluechange`    | `value`: the chosen item's value                |
| `<uiset-stepper>`      | `onvaluechange`    | `value`: the step                               |
| `<uiset-search-field>` | `onvaluechange`    | `value`: the text                               |
| `<uiset-data-grid>`    | `onselectedchange` | `value`: the selected row ids                   |
| `<uiset-data-grid>`    | `oncelledit`       | `rowId`, `column`, `value`; `preventDefault()` refuses the edit |
| `<uiset-line-chart>`   | `onselect`         | `value`: the pinned position's key, or `null`   |
| `<uiset-patch-bay>`    | `onvaluechange`    | `value`: the cables, `[{ from, to }]`           |
| `<uiset-knob>`         | `onvaluechange`    | `value`: a number                               |

Setting a property fires no event, like a native input, so writing state back into an
element never loops.

## Two-way binding

`bind:value` doesn't compile on these elements: Svelte allows it on `<input>`,
`<textarea>` and `<select>` only. Pass the value and listen for the change:

```svelte
<script lang="ts">
  type Cable = { from: string; to: string }

  let jacks = $state.raw([
    { port: "lfo:out", name: "LFO out" },
    { port: "env:out", name: "Envelope out" },
    { port: "cutoff:in", name: "Cutoff in" },
    { port: "pitch:in", name: "Pitch in" },
  ])
  let cables = $state.raw<Cable[]>([{ from: "lfo:out", to: "cutoff:in" }])
  let level = $state(40)
</script>

<uiset-patch-bay
  aria-label="Patch bay"
  value={cables}
  onvaluechange={(e: CustomEvent<{ value: Cable[] }>) => (cables = e.detail.value)}
>
  {#each jacks as jack (jack.port)}
    <uiset-patch-bay-jack value={jack.port}>
      <button aria-label={jack.name}></button>
    </uiset-patch-bay-jack>
  {/each}
</uiset-patch-bay>

<span id="level-label">Level</span>
<uiset-knob
  aria-labelledby="level-label"
  value={level}
  onvaluechange={(e: CustomEvent<{ value: number }>) => (level = e.detail.value)}
>
  <uiset-knob-indicator></uiset-knob-indicator>
  <uiset-knob-value></uiset-knob-value>
</uiset-knob>
```

The same pair works for `checked` and `oncheckedchange` on `<ui-switch>`, `value` and
`onvaluechange` on `<ui-select>`, `selected` and `onselectedchange` on the grid, and
`selected` and `onselect` on a chart.

For a real `bind:`, wrap an element in a component with a `$bindable` prop:

```svelte
<!-- StepperField.svelte -->
<script lang="ts">
  type Step = { value: string; label: string; description?: string }

  let { value = $bindable(), steps, label }: { value: string; steps: Step[]; label?: string } = $props()
</script>

<uiset-stepper {label} {steps} {value} onvaluechange={(e: CustomEvent<{ value: string }>) => (value = e.detail.value)}
></uiset-stepper>
```

```svelte
<StepperField bind:value={wrapped} label="Wrapped" {steps} />
```

## Children

- **Elements that keep your children**: the root, `<ui-button>` around its button, a patch
  bay around its jacks. `{#each}` and `{#if}` work inside them; a jack added from state
  joins the bay.
- **Elements that draw themselves** (the grid, charts, the stepper, the search field, the
  stat): give them no children.
- **The app shell moves its children** into its sidebar, header and main area. They keep
  updating there, and `{#if}` works inside them and straight under the shell: a child that
  appears later is placed in the main area after the others, and leaves again (0.3.0 or
  later).

## The element from script

`bind:this` gives you the element, with the properties and methods
[Web Components](./web-components.md) lists. The package exports a type for each element:

```svelte
<script lang="ts">
  import { iconElement, type UISetDataGrid } from "@uiset/web"

  let grid = $state<UISetDataGrid>()
  let counted = $state(0)
  function count() {
    counted = grid?.rows.length ?? -1
  }

  function icon(node: HTMLElement) {
    node.append(iconElement("check"))
  }
</script>

<uiset-data-grid bind:this={grid} label="Deep rows" rows={deepRows} {columns} {getRowId}></uiset-data-grid>
<span id="icon" use:icon></span>
```

## TypeScript

- **The package ships its types** (0.3.0 or later): the functions it exports, a type for
  each element with options of its own (`UISetDataGrid`, `UISetStepper`, `UISetPatchBay`
  and the rest; charts and the grid take your row type, as in `UISetLineChart<Month>` and
  `UISetDataGrid<Order>`), and entries in
  `HTMLElementTagNameMap`, so `document.querySelector("uiset-data-grid")` is typed.
- **Markup needs nothing.** `svelte-check` accepts the tags as they are: an unknown tag
  takes any attribute.
- **Events are typed in script.** `grid.addEventListener("celledit", (e) => …)` knows
  `e.detail`. In markup, name a handler's parameter by the element's event map,
  exported with the elements: `UISetDataGridEvents<Order>["celledit"]`, as `onCellEdit`
  does, or `UISetKnobEvents["valuechange"]`.
- **To have a tag's attributes checked**, declare it in `svelte/elements`. The element's
  type gives its properties; attributes and events are yours to list, since the type
  describes the element and not what Svelte writes on it. Its events are then typed where
  you listen:

```ts
// src/uiset-elements.d.ts
import type { UISetStepper, UISetStepperEvents } from "@uiset/web"
import type { HTMLAttributes } from "svelte/elements"

// Types for the UISet elements this app uses. Undeclared tags stay unchecked.
declare module "svelte/elements" {
  interface SvelteHTMLElements {
    "uiset-stepper": HTMLAttributes<HTMLElement> & {
      label?: string
      value?: string
      linear?: boolean | "false"
      steps?: UISetStepper["steps"]
      onvaluechange?: (event: UISetStepperEvents["valuechange"]) => void
    }
  }
}
```

```svelte
<uiset-stepper label="Setup progress" {steps} value={step} onvaluechange={(e) => (step = e.detail.value)}
></uiset-stepper>
```

## Skins and themes

The root's attributes are ordinary attributes, and changing them restyles everything
inside at once. See [Theming](./theming.md) for the skins and their variables.

```svelte
<script lang="ts">
  let skin = $state("base")
  let theme = $state<"light" | "dark" | undefined>(undefined)
  let sound = $state(false)
</script>

<uiset-root {skin} {theme} {sound}>
```

| Attribute | Values                                                                        |
| --------- | ----------------------------------------------------------------------------- |
| `skin`    | `"base"`, `"blueprint"`, `"studio"`, `"phosphor"` or `"ink"`                  |
| `theme`   | `"light"` or `"dark"`; `undefined` removes it and the page follows the system |
| `sound`   | `true` for interaction sounds, `false` for none (0.3.0 or later)              |

The themed skins have one scheme each (Studio is dark, Ink is light), so, as
[Theming](./theming.md#skins) says, `theme` is for the base skin.

### The key color

`<uiset-root>` has no key color attribute. Set what the React root sets: `data-key` and
three variables, the color's OKLCH lightness, chroma and hue.

```svelte
<script lang="ts">
  let key = $state({ l: 0.55, c: 0.2, h: 150 })
</script>

<uiset-root
  skin="base"
  data-key
  style:--uiset-key-l={key.l}
  style:--uiset-key-c={key.c}
  style:--uiset-key-h={key.h}
>
  <ui-button><button>Green key</button></ui-button>
</uiset-root>
```

### One skin inside another

The nearest root wins, so a root inside a root gives a panel its own skin or theme. It is
only as tall as what's in it (0.3.0 or later).

```svelte
<uiset-root {skin} {theme}>
  <uiset-root skin="blueprint">
    <ui-button><button>Blueprint</button></ui-button>
  </uiset-root>

  <uiset-root skin="base" theme="light">
    <ui-button><button>Always light</button></ui-button>
  </uiset-root>
</uiset-root>
```

### Fonts

The base skin uses your app's own font: the root and its controls inherit it (0.3.0 or
later). Each themed skin names its faces and falls back to system fonts. Load the ones you
use, for example Studio's from Google Fonts in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Saira+Semi+Condensed:wght@400;500;600&display=swap"
/>
```

The faces for each skin are listed in [Installation](./installation.md#fonts).

## UI SDK's Svelte components with UISet's look

UI SDK also ships native Svelte components, `@ui-sdk/svelte`. They work with UISet's
stylesheet: they render the same parts with the same `data-slot` and state attributes, and
`uiset.css` styles those attributes. Install the version UISet pins:

```bash
npm install @ui-sdk/svelte@0.1.0-beta.13
```

```svelte
<script lang="ts">
  import { Button } from "@ui-sdk/svelte/button"
  import {
    Dialog,
    DialogBackdrop,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
  } from "@ui-sdk/svelte/dialog"
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
  } from "@ui-sdk/svelte/select"
  import { Switch, SwitchThumb } from "@ui-sdk/svelte/switch"

  let emails = $state(false)
  let role = $state<string | null>(null)
</script>

<uiset-root skin="studio">
  <Button data-variant="solid">Save</Button>
  <Button data-variant="outline">Cancel</Button>
  <label>
    <Switch bind:checked={emails}><SwitchThumb /></Switch>
    Email me
  </label>
  <Select bind:value={role} placeholder="Select a role">
    <SelectLabel>Role</SelectLabel>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="viewer">Viewer</SelectItem>
      <SelectItem value="editor">Editor</SelectItem>
    </SelectContent>
  </Select>
  <Dialog>
    <DialogTrigger>Share</DialogTrigger>
    <DialogBackdrop />
    <DialogContent>
      <DialogTitle>Share link</DialogTitle>
      <DialogDescription>Anyone with the link can view this.</DialogDescription>
      <DialogClose>Done</DialogClose>
    </DialogContent>
  </Dialog>
</uiset-root>
```

What was compared, in the base and Studio skins: the button (solid, outline and with
keyboard focus), the switch (off and on), the select (label, trigger, value, open list and
items) and the dialog (trigger, content, title, description, close and backdrop), each
beside the same control written with the custom elements.

- **The look is the same.** Every computed style on every part matched, apart from what a
  browser gives a tag before any stylesheet: the native switch is a `<button>`, with a
  button's text color and alignment, which a switch doesn't draw with. Screenshots of the
  buttons, the switch, the select's label and trigger, and the open dialog matched.
- **`bind:` works** on the native components, as UI SDK's Svelte docs describe.
- **The markup differs.** The elements have a wrapper tag around their parts
  (`<ui-select>`, `<ui-dialog>`); the native components render the parts alone, so there
  is no `[data-slot="select"]` element to style or select.
- **You can skip the module.** With only the stylesheet and a plain element carrying the
  root's attributes, `data-uiset` and `data-skin`, the native button and switch were styled
  the same and no custom element was registered. You then have no `<uiset-*>` elements.

```ts
// The entry of a page that uses the stylesheet only
import { mount } from "svelte"
import "@uiset/web/uiset.css"
import "./app.css"
import CssOnly from "./CssOnly.svelte"

export default mount(CssOnly, { target: document.getElementById("app")! })
```

```svelte
<div data-uiset data-skin={skin}>
  <Button data-variant="solid">Save</Button>
  <label>
    <Switch bind:checked={emails}><SwitchThumb /></Switch>
    Email me
  </label>
</div>
```

Both kinds can share a page: the comparison rendered them in one root. Other components
were not compared.

## Server rendering

What was tested is Svelte's own server renderer (`render` from `svelte/server`, then
`hydrate` in the browser, built with Vite's `--ssr` build). SvelteKit was not tested.

- **The module imports on a server** (0.3.0 or later). It defines nothing there, so code
  that runs in both places can import it.
- **The server writes every value into the HTML as text.** An array becomes
  `rows="[object Object],…"` and a function becomes its source, as in
  `getrowid="(o) => o.id"`. The elements don't read those; Svelte sets the real values as
  properties as it hydrates.

An element draws itself as soon as it's defined, and Svelte expects to hydrate the HTML it
rendered. So mark the container Svelte hydrates with `data-uiset-hydrating` in the
server's HTML, define the elements before Svelte hydrates, and remove the attribute once it
has. Under it the elements are defined, so Svelte sets your arrays and functions on them as
properties, but they wait to draw until the attribute goes:

```html
<!-- index.html: the server's HTML goes inside -->
<div id="app" data-uiset-hydrating><!--app-html--></div>
```

```ts
// src/entry-client.ts
import "./elements" // everything that defines custom elements, @uiset/web included
import { hydrate } from "svelte"
import App from "./App.svelte"

hydrate(App, { target: document.getElementById("app")! })
document.getElementById("app")!.removeAttribute("data-uiset-hydrating")
```

The markup stays as it is. Svelte hydrates without a warning, then the grid, the chart,
the stepper and the patch bay draw with your data. `<uiset-root>` doesn't wait, so the skin
is there from the start, and until the module runs a button inside `<ui-button>` looks like
the browser's own.

Without the attribute, elements defined before Svelte hydrates have already drawn
themselves: Svelte reports that it failed to hydrate and renders the page again in the
browser. In SvelteKit the same shape should apply (the attribute on the app's root
element, removed once it has hydrated); that is untested.

## Agents

UI SDK's agent bridge reads the page's elements, whatever rendered them. Create it from the
Web Components entry, and an agent's steps fire the same events your markup listens for:

```ts
import { createAgent } from "@ui-sdk/web/agent"

const agent = createAgent()

let result = $state("")

async function act() {
  const done = await agent.act({
    steps: [
      { ref: "Email me", action: "setChecked", args: [true] },
      { ref: "Orders", action: "selectRows", args: [["Grace Hopper"]] },
    ],
  })
  result = done.ok ? "ok" : String(done.error)
}
```

What each kit offers agents, approvals and the Agent Console are in
[Web Components](./web-components.md#agent-console) and
[Building with AI agents](./ai.md).

## What was tested

On 2026-11-19, the first screen above in a new app, with `@uiset/web` 0.4.0 and UI SDK
0.1.0-beta.10 from npm (`npm install @uiset/web @ui-sdk/web`), Svelte 5.58.0, Vite 8.3.8 and
`svelte-check` 4.7.8. It passes `svelte-check` with no errors or warnings, builds, and in
Chrome its elements upgrade, take the base skin and update Svelte's state. The run through
every code block on this page, next, was on beta.5.

On 2026-11-16, in a new Vite app from the `svelte-ts` template (plain Vite, not
SvelteKit): Svelte 5.57.3, Vite 8.3.8, `@sveltejs/vite-plugin-svelte` 7.3.1, `svelte-check`
4.7.8 and TypeScript 6.0.3, with `@uiset/web` 0.2.0 from a local build (0.2.0 never went to npm; 0.3.0 carries its changes),
`@ui-sdk/web`, `@ui-sdk/core` and `@ui-sdk/svelte` 0.1.0-beta.5, on Node 24.21 and npm
11.19. The app passes `svelte-check` and builds, also in a clean install with no `shiki`.
Every code block on this page ran in it, and the production build was driven in Chrome 157
with Playwright: elements upgrading, properties arriving, events updating state, and skins
read from computed styles.

On 2026-11-17, against a later local build of 0.2.0 (Svelte 5.57.3, Vite 8.3.8,
`svelte-check` 4.7.8): the typed `onCellEdit` block and the `svelte/elements` declaration
with `svelte-check`, and the server rendering recipe, rendered with `render` and hydrated in
Chrome and WebKit with no warning.
