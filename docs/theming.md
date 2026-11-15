# Theming

How UISet looks comes from a skin: CSS variables for color, type, edges, sound and motion.
Behavior (keys, focus, screen readers, agents) never changes with it.

```bash
npx shadcn@latest add superzero11/uiset/uiset
```

## The root

```tsx
import { UISet } from "@/components/ui/uiset"

<UISet skin="base" keyColor={{ l: 0.55, c: 0.2, h: 268 }} theme="system" sound>
  <App />
</UISet>
```

| Prop       | Default    | What it does                                                                  |
| ---------- | ---------- | ----------------------------------------------------------------------------- |
| `skin`     | `"base"`   | `"base"`, `"blueprint"`, `"studio"`, `"phosphor"` or `"ink"`                  |
| `keyColor` | none       | `{ l, c, h }` in OKLCH: the base skin's accent                                |
| `theme`    | `"system"` | `"light"`, `"dark"` or `"system"` (follows the device)                        |
| `sound`    | `false`    | Short synthesized sounds on interaction, voiced per skin                      |
| `haptics`  | `true`     | A tap on Android, and the system haptic on iOS 18 Safari, for switches and the like |

Every UISet item and every UI SDK component inside takes the skin, popups included: UI SDK
renders them in place, in the browser's top layer, so they inherit it. Web Components use `<uiset-root skin="ink" theme="light"
sound>` the same way.

## Skins

| Skin        | Look                                                                    | Scheme | Faces to load                   |
| ----------- | ----------------------------------------------------------------------- | ------ | ------------------------------- |
| `base`      | Your shadcn theme, or one built from `keyColor`                         | both   | none (your app's)               |
| `blueprint` | A technical drawing: cyanotype paper, linework, hatching                | dark   | Barlow Semi Condensed           |
| `studio`    | A synth rack: gunmetal panels, rubber pads, amber lamps                 | dark   | Saira Semi Condensed            |
| `phosphor`  | A green-screen terminal: intensity, inverse video, faint scan lines     | dark   | Spline Sans Mono                |
| `ink`       | E-paper: ink on grey, dotted greys, a reading serif, no motion at all   | light  | Literata, Atkinson Hyperlegible |

Each skin falls back to system faces when its own aren't loaded; load them from Google
Fonts or self-host them for the intended look. The themed skins have one scheme, so
`theme` doesn't change them. The design notes for each are in `docs/studio.md`,
`docs/phosphor.md` and `docs/ink.md`.

Every skin is checked in every component and kit, in each scheme it has: text 4.5:1,
control edges and focus 3:1 (axe in the test suite), chart colors told apart with color
blindness (`tests/unit/chart-palette.test.ts`).

## The key color

The base skin builds its accent from one OKLCH color: solid buttons, checked controls,
the selected day, focus rings. Text on it picks black or white by lightness, and dark mode
lifts the ring toward white so it stays visible.

### A whole theme from one color

The [theme generator](https://uiset.dev/themes/generator) goes further than a key
color. From one color, a neutral tint, a radius, a density and a text size, it builds every
token for light and dark: surfaces, text, edges, focus, the four status tones and eight
chart colors. It checks 32 pairs in each scheme (text 4.5:1, controls and focus 3:1, chart
colors 3:1 and apart under color blindness), moves any derived color that fails to the
nearest lightness that passes, and offers a one-click fix when the key itself fails.

It exports the result three ways: a UISet skin file (use it with `skin="custom"`, or the
name you give it), shadcn/ui variables for `:root` and `.dark`, and W3C design tokens. The
address keeps every setting, so a link reopens the same theme.

### With a shadcn/ui theme

With no `keyColor`, the base skin adopts the shadcn theme already on the page:
`--background`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--input`,
`--primary` and `--radius`. UISet components then match the rest of your app, and your
theme switcher keeps working.

## Dark mode

`theme="system"` follows the device; `"light"` and `"dark"` pin it for the subtree. The
base skin's colors use `light-dark()`, so a light section inside a dark page is just
another `<UISet theme="light">`.

## Nesting

Skins only set variables, so the nearest root wins. A Blueprint panel inside a Base app:

```tsx
<UISet skin="base">
  <Settings />
  <UISet skin="blueprint">
    <Schematic />
  </UISet>
</UISet>
```

## Your own parts

Style your own markup with the variables, and it follows every skin:

| Variable                                   | What it is                                      |
| ------------------------------------------ | ----------------------------------------------- |
| `--ui-background`, `--ui-foreground`       | The surface and its text                        |
| `--ui-muted`, `--ui-muted-foreground`      | Quiet surfaces, and secondary text (4.5:1)      |
| `--ui-border`, `--ui-input`                | Hairlines, and control edges (3:1)              |
| `--ui-primary`, `--ui-primary-foreground`  | The accent and text on it                       |
| `--ui-ring-border`                         | Focus rings                                     |
| `--ui-radius`, `--ui-font-sans`, `--ui-font-mono` | Corners and faces                         |
| `--tone-info`, `--tone-success`, `--tone-warning`, `--tone-danger` | Status colors, readable as text |
| `--chart-1` … `--chart-8`, `--chart-seq-1` … `--chart-seq-7` | Data colors, in a fixed order     |

## Writing a skin

A skin is a stylesheet in the `uiset.skin` layer that sets variables on its own selector:

```css
@layer ui-sdk, uiset.tokens, uiset.base, uiset.skin;

@layer uiset.skin {
  [data-uiset][data-skin="harbor"] {
    color-scheme: light;
    --ui-background: oklch(0.97 0.01 220);
    --ui-foreground: oklch(0.25 0.03 230);
    --ui-primary: oklch(0.45 0.12 230);
    --ui-primary-foreground: white;
    /* …and the rest of the table above */
  }
}
```

Then `<UISet skin="harbor">`. Keep the contrast rules (text 4.5:1, edges and focus 3:1),
and check it the way UISet's skins are checked: add it to the skin loops in
`tests/e2e/components.spec.ts` and run axe. Decoration a variable can't express (a
texture, a bevel) may use selectors under the same `[data-uiset][data-skin]`, so nested
skins never inherit it.

## Sound and haptics

`sound` turns on short sounds for presses, toggles, selection and errors, made with Web
Audio (no files). Each skin picks a voice (`--uiset-sound`: `soft`, `mechanical`, `beep`
or `paper`); `--uiset-sound-volume` sets the level. Sounds follow UI SDK's own events, so
they play for agents' changes too. Haptics are on by default where the device has them.

## Motion and system settings

UISet's motion stops under `prefers-reduced-motion`; Ink has none at all. In Windows'
forced colors, state that relied on fills becomes borders, and Phosphor drops its bloom
and scan lines.
