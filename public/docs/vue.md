# Vue

UISet works in Vue 3 through its Web Components build, `@uiset/web`: one module that
defines the `<uiset-*>` elements and one stylesheet with every skin. It's built on UI SDK,
whose own `<ui-*>` elements it dresses. This page covers what is specific to Vue: setup,
passing data, events, skins, UI SDK's Vue components and server rendering. Every element's
attributes, properties and events are in [Web Components](./web-components.md).

This page describes `@uiset/web` 0.3.0 or later.

## Install

```bash
npm install @uiset/web @ui-sdk/web
```

With npm this resolves `@ui-sdk/web` and `@ui-sdk/core` to `0.1.0-beta.5`, the exact
version UISet pins. pnpm takes UI SDK's `latest` tag instead (`0.1.0-beta.3`) and reports
unmet peers, so name the versions:

```bash
pnpm add @uiset/web @ui-sdk/web@0.1.0-beta.5 @ui-sdk/core@0.1.0-beta.5
```

`shiki` is optional: with it, code in chats is colored; without it the app still builds and
code blocks are plain.

## Tell Vue the tags are elements

```ts
// vite.config.ts
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("ui-") || tag.startsWith("uiset-"),
        },
      },
    }),
  ],
})
```

Without it the elements still render, and Vue warns "Failed to resolve component" for each
tag in development.

## A first screen

Import the UI SDK elements you use, then UISet's module and stylesheet, before the app
mounts. `uiset.css` already includes UI SDK's own styles.

```ts
// src/main.ts
import { createApp } from "vue"
import "@ui-sdk/web/button"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/select"
import "@ui-sdk/web/switch"
import "@uiset/web"
import "@uiset/web/uiset.css"
import App from "./App.vue"

createApp(App).mount("#app")
```

```vue
<script setup lang="ts">
import { ref } from "vue"

const steps = [
  { value: "account", label: "Account" },
  { value: "details", label: "Details" },
  { value: "review", label: "Review" },
]
const step = ref("details")
const emails = ref(false)
</script>

<template>
  <uiset-root skin="base">
    <ui-button><button>Save</button></ui-button>
    <ui-button><button data-variant="outline">Cancel</button></ui-button>

    <label>
      <ui-switch @checkedchange="emails = $event.detail.value">
        <ui-switch-thumb></ui-switch-thumb>
      </ui-switch>
      Email me
    </label>

    <uiset-stepper
      label="Setup progress"
      :steps="steps"
      :value="step"
      @valuechange="step = $event.detail.value"
    ></uiset-stepper>

    <uiset-stat
      label="Revenue"
      value="$48,200"
      change="12%"
      direction="up"
      period="vs last month"
    ></uiset-stat>

    <p>Step: {{ step }}. Emails: {{ emails ? "on" : "off" }}.</p>
  </uiset-root>
</template>
```

`<uiset-root>` holds the skin; everything inside takes it.

## Data in

Vue sets a DOM property when the element has one by that name, and an attribute otherwise.
So text goes in as a plain attribute, and arrays, objects and functions go in with an
ordinary `:` binding, as long as the elements are defined before Vue renders (the imports
in `main.ts` above see to that).

```vue
<script setup lang="ts">
import type { UISetDataGridEvents } from "@uiset/web"
import { ref, shallowRef } from "vue"
import { orders, type Order } from "./data"

const rows = shallowRef<Order[]>(orders)
const columns = [
  { id: "customer", header: "Customer", value: (o: Order) => o.customer, editable: true },
  { id: "plan", header: "Plan", value: (o: Order) => o.plan, options: ["Free", "Pro", "Team"] },
  { id: "seats", header: "Seats", type: "number", value: (o: Order) => o.seats, editable: true },
]
const getRowId = (o: Order) => o.id

const query = ref("")
const selected = ref<string[]>([])

type CellEdit = UISetDataGridEvents<Order>["celledit"]

function onCellEdit(event: CellEdit) {
  const { rowId, column, value } = event.detail
  if (column === "seats" && Number(value) < 1) return event.preventDefault()
  rows.value = rows.value.map((o) => (o.id === rowId ? { ...o, [column]: value } : o))
}

function addOrder() {
  const id = `o${rows.value.length + 1}`
  rows.value = [...rows.value, { id, customer: "New customer", plan: "Free", seats: 1 }]
}
</script>

<template>
  <uiset-search-field
    label="Search orders"
    placeholder="Search orders…"
    :value="query"
    @valuechange="query = $event.detail.value"
  ></uiset-search-field>

  <uiset-data-grid
    label="Orders"
    selectable
    editable
    height="16rem"
    :rows="rows"
    :columns="columns"
    :getRowId="getRowId"
    :query="query"
    :selected="selected"
    @selectedchange="selected = $event.detail.value"
    @celledit="onCellEdit"
  ></uiset-data-grid>
</template>
```

Functions are properties too. A chart takes its data and the functions that read it:

```vue
<script setup lang="ts">
import { ref, shallowRef } from "vue"
import { months, type Month } from "./data"

const data = shallowRef<Month[]>(months)
const x = (d: Month) => d.month
const series = [
  { key: "revenue", label: "Revenue", value: (d: Month) => d.revenue },
  { key: "costs", label: "Costs", value: (d: Month) => d.costs },
]
const format = (n: number) => `$${n / 1000}k`
const pinned = ref<string | null>(null)
</script>

<template>
  <uiset-line-chart
    label="Revenue"
    description="By month"
    :data="data"
    :x="x"
    :series="series"
    :format="format"
    :selected="pinned"
    @select="pinned = $event.detail.value"
  ></uiset-line-chart>
  <uiset-sparkline label="Revenue, five months" :values="data.map((d) => d.revenue)"></uiset-sparkline>
</template>
```

Four things to know:

- **Replace arrays, don't change them in place.** An element redraws when its property is
  set again. `rows.value.push(…)` on a deep `ref` changes your state and leaves the grid
  as it was; `rows.value = [...rows.value, row]` redraws it. `shallowRef` fits: the
  element gets your plain array, and only replacing it counts as a change.
- **If Vue renders before the elements are defined**, it finds no property and writes
  `rows="[object Object],…"` as an attribute. Define them first; a server-rendered page
  does that with `data-uiset-hydrating` (see [Server rendering](#server-rendering)).
- **An attribute that turns something on** (`selectable`, `editable`, `toolbar`, the
  root's `sound`) is written bare, as above, or bound to a boolean. `false` turns it off:

```vue
<uiset-data-grid :toolbar="flags.toolbar"></uiset-data-grid>
```

- **A list can be text or an array.** A sparkline's `values` and a stat's `trend` take
  either; an empty place in the text is a gap:

```vue
<uiset-sparkline label="Trend" values="4,6,,8"></uiset-sparkline>
<uiset-sparkline label="Trend" :values="[4, 6, null, 8]"></uiset-sparkline>
<uiset-stat label="Revenue" value="$48,200" trend="31,35,33,40,48"></uiset-stat>
```

The grid's and search field's plain `label`, the boolean bindings and the text lists need
`@uiset/web` 0.3.0 or later.

## Events out

The elements report changes as DOM events, named in lowercase, with the new value in
`event.detail`. Listen with `@`:

| Element                | Event            | `$event.detail`                                   |
| ---------------------- | ---------------- | ------------------------------------------------- |
| `<ui-switch>`          | `checkedchange`  | `value`: on or off                                |
| `<ui-select>`          | `valuechange`    | `value`: the chosen item's value                  |
| `<uiset-stepper>`      | `valuechange`    | `value`: the step                                 |
| `<uiset-search-field>` | `valuechange`    | `value`: the text                                 |
| `<uiset-data-grid>`    | `selectedchange` | `value`: the selected row ids                     |
| `<uiset-data-grid>`    | `celledit`       | `rowId`, `column`, `value`; `preventDefault()` refuses the edit |
| `<uiset-line-chart>`   | `select`         | `value`: the pinned position's key, or `null`     |
| `<uiset-patch-bay>`    | `valuechange`    | `value`: the cables, `[{ from, to }]`             |
| `<uiset-knob>`         | `valuechange`    | `value`: a number                                 |

Setting a property fires no event, like a native input, so writing state back into an
element never loops. `$event` is untyped in a template; type the handler's parameter with
the element's event map, as `onCellEdit` does above.

## Two-way binding

`v-model` works on every element with a value a person changes (0.3.0 or later): the
search field, stepper, knob, patch bay, wheel, rich text, code editor, chat composer, chat
threads, model picker, file tree and editor tabs. Vue treats a custom element like a text
input: it sets `value` and reads it back on `input`, and each of these fires `input` once a
change is in.

```vue
<uiset-search-field label="Search orders" v-model="query"></uiset-search-field>
<uiset-stepper label="Setup" :steps="steps" v-model="step"></uiset-stepper>

<span id="level-label">Level</span>
<uiset-knob aria-labelledby="level-label" v-model="level">
  <uiset-knob-indicator></uiset-knob-indicator>
  <uiset-knob-value></uiset-knob-value>
</uiset-knob>

<uiset-patch-bay aria-label="Patch bay" v-model="cables">
  <uiset-patch-bay-jack v-for="jack in jacks" :key="jack.port" :value="jack.port">
    <button :aria-label="jack.name"></button>
  </uiset-patch-bay-jack>
</uiset-patch-bay>
```

- **State set in Vue reaches the element**, and fires nothing, so it never loops.
- **A refused change stays refused.** A `valuechange` listener that calls
  `preventDefault()` keeps the value, and no `input` fires.
- **`v-model.lazy` waits for `change`**: a finished choice, or a knob let go.
- **It doesn't compile for the server.** Vue's server compiler allows `v-model` on
  `<input>`, `<textarea>` and `<select>` only. A server-rendered app binds the value and
  listens, which works on every element:

```vue
<uiset-knob aria-labelledby="level-label" :value="level" @valuechange="level = $event.detail.value">
  <uiset-knob-indicator></uiset-knob-indicator>
  <uiset-knob-value></uiset-knob-value>
</uiset-knob>
```

The same pair works for `:checked` and `@checkedchange` on `<ui-switch>`, `:value` and
`@valuechange` on `<ui-select>`, `:selected` and `@selectedchange` on the grid, and
`:selected` and `@select` on a chart.

## Children

- **Elements that keep your children**: the root, `<ui-button>` around its button, a
  patch bay around its jacks. `v-for` and `v-if` work inside them; a jack added from state
  joins the bay.
- **Elements that draw themselves** (the grid, charts, the stepper, the search field, the
  stat): give them no children.
- **The app shell moves its children** into its sidebar, header and main area. They keep
  updating there, and `v-if` works inside them and straight under the shell: a child that
  appears later is placed in the main area after the others, and leaves again (0.3.0 or
  later).

## The element from script

A template ref is the element, with the properties and methods
[Web Components](./web-components.md) lists. The package exports a type for each element:

```ts
import { iconElement, type UISetDataGrid } from "@uiset/web"

const grid = useTemplateRef<UISetDataGrid>("grid")
const counted = ref(0)
function count() {
  counted.value = grid.value?.rows.length ?? -1
}

const iconHost = useTemplateRef<HTMLElement>("icon")
onMounted(() => iconHost.value?.append(iconElement("check")))
```

## TypeScript

- **The package ships its types** (0.3.0 or later): the functions it exports, a type for
  each element with options of its own (`UISetDataGrid`, `UISetStepper`, `UISetPatchBay`
  and the rest; charts and the grid take your row type, as in `UISetLineChart<Month>` and
  `UISetDataGrid<Order>`), and entries in
  `HTMLElementTagNameMap`, so `document.querySelector("uiset-data-grid")` is typed. UI
  SDK's elements are typed the same way once you import them.
- **Templates need nothing by default.** `vue-tsc` accepts the tags with the settings of
  Vite's `vue-ts` template: an unknown tag is unchecked.
- **`strictTemplates` needs the tags declared.** It reports each unknown tag, and each
  `data-` attribute, as an error. The element types describe the elements, not what a
  template may write on them (attributes, properties and listeners together), so the
  declaration names the tags and leaves their options unchecked:

```ts
// src/custom-elements.d.ts
import type { DefineComponent } from "vue"

// Any attribute, property or listener: the tags are known, their options are not checked.
type CustomElement = DefineComponent<Record<string, unknown>>

declare module "vue" {
  interface GlobalComponents {
    [tag: `ui-${string}`]: CustomElement
    [tag: `uiset-${string}`]: CustomElement
  }
}
```

```json
"vueCompilerOptions": { "strictTemplates": true, "dataAttributes": ["data-*"] }
```

- **Events are typed in script.** `grid.addEventListener("celledit", (e) => …)` knows
  `e.detail`. A template's `$event` isn't; name a handler's parameter by the element's
  event map, exported with the elements: `UISetDataGridEvents<Order>["celledit"]`,
  `UISetKnobEvents["valuechange"]`, as `onCellEdit` does.

## Skins and themes

The root's attributes are ordinary bindings, and changing them restyles everything inside
at once. See [Theming](./theming.md) for the skins and their variables.

```vue
<uiset-root :skin="skin" :theme="theme" :sound="sound">
```

| Attribute | Values                                                                      |
| --------- | --------------------------------------------------------------------------- |
| `skin`    | `"base"`, `"blueprint"`, `"studio"`, `"phosphor"` or `"ink"`                |
| `theme`   | `"light"` or `"dark"`; `null` removes it and the page follows the system    |
| `sound`   | `true` for interaction sounds, `false` for none (0.3.0 or later)            |

The themed skins have one scheme each (Studio is dark, Ink is light), so, as
[Theming](./theming.md#skins) says, `theme` is for the base skin.

### The key color

`<uiset-root>` has no key color attribute. Set what the React root sets: `data-key` and
three variables, the color's OKLCH lightness, chroma and hue.

```vue
<script setup lang="ts">
import { computed, ref } from "vue"

const key = ref({ l: 0.55, c: 0.2, h: 150 })
const keyStyle = computed(() => ({
  "--uiset-key-l": key.value.l,
  "--uiset-key-c": key.value.c,
  "--uiset-key-h": key.value.h,
}))
</script>

<template>
  <uiset-root skin="base" data-key :style="keyStyle">
    <ui-button><button>Green key</button></ui-button>
  </uiset-root>
</template>
```

### One skin inside another

The nearest root wins, so a root inside a root gives a panel its own skin or theme. It is
only as tall as what's in it (0.3.0 or later).

```vue
<uiset-root :skin="skin" :theme="theme">
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

## UI SDK's Vue components with UISet's look

UI SDK also ships native Vue components, `@ui-sdk/vue`. They work with UISet's stylesheet:
they render the same parts with the same `data-slot` and state attributes, and `uiset.css`
styles those attributes. Install the version UISet pins:

```bash
npm install @ui-sdk/vue@0.1.0-beta.5
```

```vue
<script setup lang="ts">
import { Button } from "@ui-sdk/vue/button"
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@ui-sdk/vue/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/vue/select"
import { Switch, SwitchThumb } from "@ui-sdk/vue/switch"
import { ref } from "vue"

const emails = ref(false)
const role = ref<string | null>(null)
</script>

<template>
  <uiset-root skin="studio">
    <Button data-variant="solid">Save</Button>
    <Button data-variant="outline">Cancel</Button>
    <label>
      <Switch v-model="emails"><SwitchThumb /></Switch>
      Email me
    </label>
    <Select v-model="role" placeholder="Select a role">
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
</template>
```

What was compared, in the base and Studio skins: the button (solid, outline and with
keyboard focus), the switch (off and on), the select (label, trigger, value, open list and
items) and the dialog (trigger, content, title, description, close and backdrop), each
beside the same control written with the custom elements.

- **The look is the same.** Every computed style on every part matched, apart from what a
  browser gives a tag before any stylesheet: the native switch is a `<button>`, with a
  button's text color and alignment, which a switch doesn't draw with. Screenshots of the
  buttons, the switch, the select's label and trigger, and the open dialog matched.
- **`v-model` works** on the native components, as UI SDK's Vue docs describe.
- **Layout can differ.** The elements have a wrapper tag around their parts (`<ui-select>`,
  `<ui-dialog>`); the native components render the parts alone. Placed straight into a
  grid, the native dialog trigger became the grid item and the element's did not.
- **You can skip the module.** With only the stylesheet and a plain element carrying the
  root's attributes, `data-uiset` and `data-skin`, the native button and switch were styled
  the same and no custom element was registered. You then have no `<uiset-*>` elements.

```ts
// The entry of a page that uses the stylesheet only
import { createApp } from "vue"
import "@uiset/web/uiset.css"
import CssOnly from "./CssOnly.vue"

createApp(CssOnly).mount("#app")
```

```vue
<div data-uiset :data-skin="skin">
  <Button data-variant="solid">Save</Button>
  <label>
    <Switch v-model="emails"><SwitchThumb /></Switch>
    Email me
  </label>
</div>
```

Both kinds can share a page: the comparison rendered them in one root. Other components
were not compared.

## Server rendering

What was tested is Vue's own server renderer (`renderToString`, then `createSSRApp`
hydrating in the browser, built with Vite's `--ssr` build). Nuxt was not tested.

- **The module imports on a server** (0.3.0 or later). It defines nothing there, so code
  that runs in both places can import it.
- **The server sends the tags and their text attributes.** Arrays, objects and functions
  are left out; Vue sets them as properties as it hydrates.
- **`v-model` doesn't compile for the server.** Vue's server compiler allows it on
  `<input>`, `<textarea>` and `<select>` only, so a server-rendered app binds the value and
  listens, as in [Two-way binding](#two-way-binding).

An element draws itself as soon as it's defined, and Vue expects to hydrate the HTML it
rendered. So mark the container Vue hydrates with `data-uiset-hydrating` in the server's
HTML, define the elements before Vue hydrates, and remove the attribute once it has. Under
it the elements are defined, so Vue finds their properties and sets your arrays and
functions on them, but they wait to draw until the attribute goes:

```html
<!-- index.html: the server's HTML goes inside -->
<div id="app" data-uiset-hydrating><!--app-html--></div>
```

```ts
// src/entry-client.ts
import "./elements" // everything that defines custom elements, @uiset/web included
import { createSSRApp } from "vue"
import App from "./App.vue"

createSSRApp(App).mount("#app")
document.getElementById("app")!.removeAttribute("data-uiset-hydrating")
```

The templates stay as they are: `:rows="rows"` with no `.prop`. Vue hydrates without a
mismatch, then the grid, the chart, the stepper and the patch bay draw with your data.
`<uiset-root>` doesn't wait, so the skin is there from the start, and until the module
runs a button inside `<ui-button>` looks like the browser's own.

Without the attribute, neither order works: defined before Vue hydrates, the app shell has
already laid out its children and Vue throws the page's HTML away; defined after, Vue
writes arrays as attributes (`rows="[object Object],…"`) and the grid stays empty. In Nuxt
the same shape should apply (the attribute on the app's root element, removed once the app
has mounted); that is untested.

## Agents

UI SDK's agent bridge reads the page's elements, whatever rendered them. Create it from the
Web Components entry, and an agent's steps fire the same events your template listens for:

```ts
import { createAgent } from "@ui-sdk/web/agent"

const agent = createAgent()
const result = ref("")

async function act() {
  const done = await agent.act({
    steps: [
      { ref: "Email me", action: "setChecked", args: [true] },
      { ref: "Orders", action: "selectRows", args: [["Grace Hopper"]] },
    ],
  })
  result.value = done.ok ? "ok" : String(done.error)
}
```

What each kit offers agents, approvals and the Agent Console are in
[Web Components](./web-components.md#agent-console) and
[Building with AI agents](./ai.md).

## What was tested

On 2026-11-16, in a new Vite app from the `vue-ts` template: Vue 3.5.45, Vite 8.3.8,
`@vitejs/plugin-vue` 6.0.11, `vue-tsc` 3.3.14 and TypeScript 6.0.3, with `@uiset/web`
0.2.0 from a local build (0.2.0 never went to npm; 0.3.0 carries its changes), `@ui-sdk/web`, `@ui-sdk/core` and `@ui-sdk/vue`
0.1.0-beta.5, on Node 24.21 and npm 11.19. The app typechecks (default settings and
`strictTemplates`) and builds, also in a clean install with no `shiki`. Every code block on
this page ran in it, and the production build was driven in Chrome 157 with Playwright:
elements upgrading, properties arriving, events updating state, and skins read from
computed styles.

On 2026-11-17, against a later local build of 0.2.0 (Vue 3.5.45, Vite 7.3.8,
`@vitejs/plugin-vue` 6.0.11, `vue-tsc` 3.3.14): `v-model` on the eleven elements that
gained it (the search field had it already), driven in Chrome and WebKit (each element
shows the state it's given, a person's change reaches the state, and state set later
reaches the element); the typed `onCellEdit` block with `vue-tsc`; and the server rendering
recipe, rendered with `renderToString` and hydrated in Chrome and WebKit with no mismatch.
