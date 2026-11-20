# Theming

How UISet looks comes from a skin: CSS variables for color, type, edges, sound and motion.
Behavior (keys, focus, screen readers, agents) never changes with it.

```bash
npx shadcn@latest add @uiset/uiset
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
| `keyColor` | none       | `{ l, c, h }` in OKLCH: the base skin's accent (black and white without one)   |
| `theme`    | `"system"` | `"light"`, `"dark"` or `"system"` (follows the device)                        |
| `motion`   | `"system"` | `"reduce"` fades and moves nothing inside, whatever the system setting says (see Motion) |
| `sound`    | `false`    | Short synthesized sounds on interaction, voiced per skin                      |
| `haptics`  | `true`     | A tap on Android, and the system haptic on iOS 18 Safari, for switches and the like |

Every UISet item and every UI SDK component inside takes the skin, popups included: UI SDK
renders them in place, in the browser's top layer, so they inherit it. Web Components use `<uiset-root skin="ink" theme="light"
motion="reduce" sound>` the same way.

## Skins

| Skin        | Look                                                                    | Scheme | Faces to load                   |
| ----------- | ----------------------------------------------------------------------- | ------ | ------------------------------- |
| `base`      | Your shadcn theme, one built from `keyColor`, or black and white        | both   | none (your app's)               |
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
the selected day, focus rings. Text on it picks black or white by lightness, dark mode
lifts the ring toward white so it stays visible, and the grays lean slightly toward its hue.

With no `keyColor` and no shadcn theme on the page, the base skin is black and white: a
near-black accent (near-white in dark mode) on neutral grays, the look of shadcn/ui's
default theme and of uiset.dev.

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
`--primary` and `--radius`, with `--primary-foreground` for text on the accent. UISet
components then match the rest of your app, solid buttons hover the way shadcn/ui's do,
and your theme switcher keeps working.

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
`tests/e2e/components.spec.ts` and run axe.

Variables stay with their skin on their own: a nested skin sets its own. Decoration a
variable can't express (a texture, a bevel, uppercase labels) needs selectors, and those
reach into a skin nested inside, like a Base card on a Harbor page. Put them in a scope that
stops at another skin's root, and start the root rule with `:where(:scope)`, since inside
`@scope` a bare root selector only matches a nested root:

```css
@layer uiset.skin {
  @scope ([data-uiset][data-skin="harbor"]) to ([data-uiset]:not([data-skin="harbor"])) {
    :where(:scope)[data-uiset][data-skin="harbor"] {
      --ui-background: oklch(0.97 0.01 220);
      /* …the variables */

      & [data-slot="field-label"] {
        text-transform: uppercase;
      }
    }
  }
}
```

UISet's five skins are written this way. `@scope` works in every browser UISet supports
(Chrome 118, Safari 17.4, Firefox 146).

## Sound and haptics

`sound` turns on short sounds for presses, toggles, selection and errors, made with Web
Audio (no files). Each skin picks a voice (`--uiset-sound`: `soft`, `mechanical`, `beep`
or `paper`); `--uiset-sound-volume` sets the level. Sounds follow UI SDK's own events, so
they play for agents' changes too. Haptics are on by default where the device has them.

## Motion

Each skin opens and closes things, and turns them on and off, its own way. The motion runs
on UI SDK's own state (`data-starting-style`, `data-ending-style`, `data-checked`), so an
agent's change moves the way a person's does, and nothing waits for it: focus moves and
announcements happen at the start.

| Skin        | Opening                                              | Closing                                       | Panel                     |
| ----------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------- |
| `base`      | Fades in and grows from 96%, 150 ms                   | Fades and shrinks, 100 ms                     | Eases open, 200 ms        |
| `blueprint` | Drawn from the trigger's side at an even pace, 200 ms | Erased back toward the trigger, 140 ms        | Extends evenly, 200 ms    |
| `studio`    | Drops 8 px into place and stops dead, 120 ms          | Lifts out, 90 ms                              | Opens with a hard stop, 130 ms |
| `phosphor`  | Drawn top to bottom in four scan steps, 100 ms        | Fades like cooling phosphor, 280 ms; clicks go through it | A line at a time, 100 ms |
| `ink`       | Appears                                               | Disappears                                    | Redraws                   |

Popovers, menus, select and combobox lists, tooltips, hover cards, date pickers, dialogs and
toasts take part, and accordion and collapsible panels grow from their measured height.
Dialogs take a little longer to open (Base 200 ms, Blueprint 240, Studio 150, Phosphor 120)
and close at once: while a modal dialog is still leaving, UI SDK takes a press outside it for
one outside an open dialog, and the click would be lost. The drawer keeps UI SDK's own
spring. A tooltip that opens at once, because another was just
open, doesn't animate.

| Skin        | On and off (switch, checkbox, radio, toggle)              | A press an alert dialog refuses        |
| ----------- | --------------------------------------------------------- | -------------------------------------- |
| `base`      | Eases, 150 ms; the check grows in                         | The dialog swells a little and settles |
| `blueprint` | Even pace, 160 ms; the check is inked in from the start of the line | A jog aside at an even pace   |
| `studio`    | A lamp: warms in 60 ms, cools in 300 ms                   | A jolt in the rack that stops dead     |
| `phosphor`  | At once, like inverse video                               | A step aside and back                  |
| `ink`       | At once                                                   | Nothing moves                          |

An alert dialog never closes on a press outside it, so it nudges: the press visibly did
something. A field's error appears on the same timing as on and off.

| Skin        | Moves (a reordered item, a switch's thumb, a segmented control's indicator) |
| ----------- | ------------------------------------------------------------------------- |
| `base`      | Glides, 200 ms                                                            |
| `blueprint` | Slides in a straight line at an even speed, 220 ms                        |
| `studio`    | Snaps to its place like a stepped knob, 140 ms                            |
| `phosphor`  | Jumps in whole steps, 120 ms                                              |
| `ink`       | Jumps                                                                     |

The sortable list and tree and the board slide their items to new places with
`shell/glide.ts`, whether a person or an agent moved them. The items stay the real elements,
so focus and a second move work while they slide.

**Less motion.** Under the system's `prefers-reduced-motion`, or inside
`<UISet motion="reduce">`, nothing moves, grows or is drawn, in any skin: what appears and
disappears fades (120 ms in, 90 ms out), panels snap open, and on and off, errors,
refusals and moves change at once. Everything else, color included, changes at once. Ink stays instant either way. `motion="reduce"` lets an app offer its own switch, or quiet one
part of a page.

**Speed.** `--uiset-motion-speed` (1 by default) scales every duration in every skin: 0.5
is twice as fast.

**In your own skin**, set the timings on the skin's root. Where an opening starts from is an
opacity, a scale and a vertical shift; a closing has the same four, with `exit`:

```css
--uiset-enter-duration: 160ms;
--uiset-enter-ease: cubic-bezier(0.23, 1, 0.32, 1);
--uiset-enter-opacity: 0;
--uiset-enter-scale: 0.98;
--uiset-enter-shift: -4px;
--uiset-exit-duration: 110ms; /* and --uiset-exit-ease, -opacity, -scale, -shift */
--uiset-dialog-time: 1.3; /* dialogs take this many times as long */
--uiset-toast-shift: 0.5rem; /* toasts come in from their edge */
--uiset-panel-duration: 200ms; /* accordion and collapsible panels */
--uiset-panel-close-duration: 150ms;
--uiset-panel-ease: cubic-bezier(0.23, 1, 0.32, 1);
--uiset-toggle-duration: 150ms; /* on, and a check or a dot appearing */
--uiset-toggle-off-duration: 150ms; /* off, which can be slower, like a cooling lamp */
--uiset-toggle-ease: cubic-bezier(0.23, 1, 0.32, 1);
--uiset-check-scale: 0.5; /* a check grows from this size */
--uiset-nudge-duration: 200ms; /* a refused press */
--uiset-nudge-ease: cubic-bezier(0.23, 1, 0.32, 1);
--uiset-nudge-scale: 1.02;
--uiset-nudge-shift: 0px; /* sideways, at the nudge's halfway point */
--uiset-move-duration: 200ms; /* a move; 0ms makes items jump */
--uiset-move-ease: cubic-bezier(0.23, 1, 0.32, 1);
```

Reduced motion overrides these, so a skin doesn't need its own reduced version. The design
notes are in `design/motion-plan.md`.

## Forced colors

In Windows' forced colors, state that relied on fills becomes borders, and Phosphor drops
its bloom and scan lines.
