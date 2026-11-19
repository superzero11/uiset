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

UISet doesn't need Tailwind, and works beside it ([With Tailwind CSS](#with-tailwind-css)).

### 2. Add the root

The root brings the tokens, the five skins, sound and haptics, and installs UI SDK's packages
(`@ui-sdk/core` and `@ui-sdk/react`) at the version UISet is tested with.

```bash
npx shadcn@latest add @uiset/uiset
```

npm records them with a `^`, which lets a later UI SDK beta in. Pin the version the root
installed: `npm install --save-exact @ui-sdk/core@<version> @ui-sdk/react@<version>`.

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
it's black and white; for a color, pass `keyColor={{ l: 0.5, c: 0.19, h: 268 }}` or make a theme in the
[theme generator](/themes/generator).

### With Tailwind CSS

Nothing to set up for Tailwind CSS 4. On a page with Tailwind's layers, UISet puts its own
between Tailwind's `base` and `components`: Tailwind's reset doesn't touch UISet's controls,
and your utility classes still win over UISet's styles. An older copy of the root (one
without `components/ui/uiset/layers.ts`) doesn't do this; add the root again with
`--overwrite`.

On a server-rendered page, as in Next.js, UISet sets that order when the page hydrates. For
the first paint to have it too, import your global stylesheet before any UISet component, as
Next.js and Vite apps usually do, and put this line at the top of it, before
`@import "tailwindcss";`:

```css
@layer theme, base, uiset, components, utilities;
```

### 4. Add what you need

```bash
npx shadcn@latest add @uiset/button @uiset/field @uiset/data-grid
```

Each item lands in `components/ui/` and brings the items it depends on. Every docs page
has the command for its item, for pnpm, npm, yarn and bun.

### Addresses

`@uiset` is UISet's namespace in shadcn's registry directory, so the CLI finds
`@uiset/<item>` at `https://uiset.dev/r/<item>.json` with no setup. Two other addresses
reach the same items: the GitHub repository, and the site's URL for each.

```bash
npx shadcn@latest add superzero11/uiset/data-grid
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

pnpm resolves UI SDK's `latest` tag, which is an older beta than the one UISet pins, so name
the versions there:

```bash
pnpm add @uiset/web @ui-sdk/web@0.1.0-beta.10 @ui-sdk/core@0.1.0-beta.10
```

```html
<link rel="stylesheet" href="node_modules/@uiset/web/dist/uiset.css" />
<script type="module">
  import "@uiset/web"
</script>

<uiset-root skin="base">
  <uiset-data-grid label="Orders"></uiset-data-grid>
</uiset-root>
```

With a bundler, import the stylesheet instead: `import "@uiset/web/uiset.css"`. The package
ships its TypeScript types. See [Web Components](./web-components.md) for every element, and
the [Vue](./vue.md) and [Svelte](./svelte.md) guides for those frameworks.

## Check it works

Render a button inside the root and tab to it: it should show the skin's focus ring. If it
looks unstyled, the root isn't around it, or `uiset.css` (imported by `uiset.tsx`) didn't
load.

## Updating

Run the same `add` command again with `--overwrite` to take a newer version of an item.
Your changes to that file are replaced, so commit first and compare.
