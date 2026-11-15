# Installation

UISet installs with the shadcn CLI, one item at a time, into your project's components
folder. You need React 19 and a project the shadcn CLI can write to.

## With the shadcn CLI

### 1. Set up the project

If your project already uses shadcn/ui, skip this step. Otherwise run `init` once; it
writes `components.json`, which tells the CLI where components go and what `@/` means.

```bash
npx shadcn@latest init
```

UISet doesn't need Tailwind. If `init` asks, any choice works.

### 2. Add the root

The root brings the tokens, the five skins, sound and haptics, and pins UI SDK's packages
(`@ui-sdk/core` and `@ui-sdk/react`) at the exact version UISet is tested with.

```bash
npx shadcn@latest add superzero11/uiset/uiset
```

### 3. Wrap your app

```tsx
import { UISet } from "@/components/ui/uiset"

export function App() {
  return (
    <UISet skin="base">
      <Routes />
    </UISet>
  )
}
```

With a shadcn/ui theme on the page, the base skin uses its colors and radius. Without one,
pass `keyColor={{ l: 0.5, c: 0.19, h: 268 }}` or make a theme in the
[theme generator](/themes/generator).

### 4. Add what you need

```bash
npx shadcn@latest add superzero11/uiset/button superzero11/uiset/field superzero11/uiset/data-grid
```

Each item lands in `components/ui/` and brings the items it depends on. Every docs page
has the command for its item, for pnpm, npm, yarn and bun.

### Addresses

`superzero11/uiset/<item>` reads the registry from GitHub. Each item is also served from
the site, if you prefer an address:

```bash
npx shadcn@latest add https://uiset.dev/r/data-grid.json
```

## Fonts

The base skin uses your app's fonts. The themed skins name the faces they were drawn for
and fall back to system fonts without them. Load the ones you use, from Google Fonts or
your own files:

| Skin        | Faces                           |
| ----------- | ------------------------------- |
| `blueprint` | Barlow Semi Condensed           |
| `studio`    | Saira Semi Condensed            |
| `phosphor`  | Spline Sans Mono                |
| `ink`       | Literata, Atkinson Hyperlegible |

## Web Components

For Vue, Svelte, Solid, Angular or plain HTML, use the Web Components build: one module and
one stylesheet, with UI SDK as a peer.

```bash
npm install @uiset/web @ui-sdk/web
```

```html
<script type="module">
  import "@uiset/web"
</script>

<uiset-root skin="base">
  <uiset-data-grid label="Orders"></uiset-data-grid>
</uiset-root>
```

See [Web Components](./web-components.md) for every element.

## Check it works

Render a button inside the root and tab to it: it should show the skin's focus ring. If it
looks unstyled, the root isn't around it, or `uiset.css` (imported by `uiset.tsx`) didn't
load.

## Updating

Run the same `add` command again with `--overwrite` to take a newer version of an item.
Your changes to that file are replaced, so commit first and compare.
