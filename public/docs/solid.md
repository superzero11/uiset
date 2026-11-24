# Solid

UISet for Solid 2 is `@uiset/solid`: UISet's skins, components, kits and templates written
in Solid, on UI SDK's Solid components (`@ui-sdk/solid`). It shares its stylesheet and its
logic with the React registry and the Web Components build, so an item looks and behaves the
same in all three, agents included.

It's being built for 0.7.0, item by item ([roadmap](./roadmap.md)). In it now:

- The `UISet` root, with the five skins, the key color, Base's light and dark, motion, sound
  and haptics.
- UI SDK's 55 components, with UISet's defaults where React has them: a switch brings its
  thumb, a select trigger its value, a number input its named step buttons, a slider a thumb
  for each value.
- UISet's own parts: alert, avatar group, badge and count badge, breadcrumbs, card, confirm
  and copy buttons, description and item lists, empty state, keyboard keys, page header,
  password rules, radio cards, scroll box, search field, skeleton and loading, spinner,
  stepper, textarea count and toaster.

Each component's docs page has its example in Solid under the Solid tab. Until a kit or
template is in, use its element from the
[Web Components build](./web-components.md#vue-svelte-and-solid) in the same app: both read
the same `uiset.css`.

## Install

Solid 2 only: `solid-js` and `@solidjs/web` 2.0 or later. From 0.7.0:

```bash
npm install @uiset/solid @ui-sdk/solid@0.1.0-beta.16 @ui-sdk/core@0.1.0-beta.16
```

UISet pins UI SDK exactly. With Vite, leave `@ui-sdk/core` out of pre-bundling, as UI SDK's
Solid docs say: a second copy of it makes UI SDK's components throw in development.

```ts
// vite.config.ts
import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [solid()],
  optimizeDeps: { exclude: ["@ui-sdk/core"] },
})
```

## Components

Each item is its own entry, named as in the React registry, with the same parts:

```tsx
import { Button, ConfirmButton } from "@uiset/solid/button"
import { Field, FieldLabel, Input } from "@uiset/solid/field"
import { Switch } from "@uiset/solid/switch"
```

Props follow UI SDK's Solid components: `class`, not `className`, and lowercase HTML
attributes (`maxlength`, `autocomplete`) on the element a part renders. A UI SDK option keeps
its name, like a password input's `autoComplete`. A part's `render` takes a function,
`render={(props) => <a href="/ada" {...props} />}`, and children may be a function of the
part's state.

## The root

Wrap the app, or any part of it, in `UISet`. Importing it brings UISet's stylesheet; skins
set their colors on the root, so roots nest without leaking.

```tsx
import { createSignal } from "solid-js"
import { UISet, type Skin } from "@uiset/solid"

function App() {
  const [skin, setSkin] = createSignal<Skin>("base")
  return (
    <UISet skin={skin()} theme="system" sound>
      <Settings onSkinChange={setSkin} />
    </UISet>
  )
}
```

It takes the React root's props: `skin`, `keyColor` (`{ l, c, h }`, Base's accent), `theme`
(`"light"`, `"dark"` or `"system"`, for Base and generated skins; Blueprint, Studio and
Phosphor are dark, and Ink is light, whatever `theme` says), `motion` (`"reduce"` keeps
fades and moves nothing), `sound` and `haptics`, and any `div` attribute. As everywhere in
Solid 2, pass values (`skin={skin()}`), not the signal; the root follows them as they change.

UI SDK's own Solid components inside the root take its look already, because UISet styles
their `data-slot` parts. Sound and haptics follow them through UI SDK's `observe()`.

## Agents

UI SDK's agent bridge for Solid sees everything inside the root by the names people see:

```ts
import { createAgent } from "@ui-sdk/solid/agent"

const agent = createAgent()
await agent.act({ steps: [{ ref: "Save", action: "press" }] })
```

## Server rendering

`@uiset/solid` serves its source to Solid's compiler (the `solid` export condition), so
SolidStart renders it on the server and hydrates it like your own components.
