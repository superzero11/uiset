# Motion

Pieces a page puts on purpose, that move each skin its own way: a number that moves to its
new value, text that arrives as it streams, a wait, and content swapped in place. They're
built on the same per-skin timings as the rest of UISet (see Theming, Motion), so a Studio page
counts like a synth and a Phosphor page types like a terminal.

```bash
npx shadcn@latest add @uiset/number-ticker @uiset/text-reveal @uiset/thinking @uiset/crossfade
```

## Parts

| Part           | Item            | What it is                                                         |
| -------------- | --------------- | ------------------------------------------------------------------ |
| `NumberTicker` | `number-ticker` | A number that moves to its new value                               |
| `TextReveal`   | `text-reveal`   | Text that arrives a word or a letter at a time                     |
| `Thinking`     | `thinking`      | A wait, said once to screen readers                                |
| `Crossfade`    | `crossfade`     | Content swapped in place, the box moving to the new size           |

## Each skin

| Skin        | Number ticker                          | Text reveal                         | Thinking                   | Crossfade                              |
| ----------- | -------------------------------------- | ----------------------------------- | -------------------------- | -------------------------------------- |
| `base`      | Digits roll like an odometer           | Words rise a little and fade in     | The words shimmer          | Fades across while the box glides      |
| `blueprint` | Counts at an even pace                 | Each word is drawn left to right    | Hatching moves along a bar | Wiped across from the start of the line |
| `studio`    | Switches in hard steps                 | Words light up amber and cool       | Three LEDs chase           | A hard cut; the box snaps to size      |
| `phosphor`  | Typed in from the left, with a caret   | Typed a letter at a time, with a caret | Dots print one by one   | Scanned in top to bottom               |
| `ink`       | Redraws                                | Appears                             | Still dots                 | Redraws                                |

Under reduced motion, or inside `<UISet motion="reduce">`, nothing moves: a ticker shows its
new value, text appears whole, Thinking is still words, and a crossfade swaps at once.

## Number ticker

```tsx
import { NumberTicker } from "@/components/ui/number-ticker"

<NumberTicker value={revenue} format={{ style: "currency", currency: "USD" }} />
<NumberTicker value={1284} from={0} />
```

- It moves when `value` changes. `from` counts up from that number once, when the ticker first
  scrolls into view; leave it out and it simply shows the value.
- `format` is `Intl.NumberFormat` options, or your own `(value) => string`; `locale` picks the
  language.
- Screen readers and agents read the value itself: the moving digits are hidden from them.
  Put it in a sentence or next to a label ("Revenue this month") so the number has a name.

## Text reveal

```tsx
import { TextReveal } from "@/components/ui/text-reveal"

<p>
  <TextReveal>{answer}</TextReveal>
</p>
```

- `children` is the text, a string. When it grows, as a streamed answer does, only what's new
  is revealed; when it changes otherwise, all of it is.
- `by` is `"word"` or `"letter"`; by default the skin chooses (Phosphor types letters).
- The whole text is in the page from the start, so screen readers, copy and agents get all of
  it. Wrap it in your own `p` or heading.

## Thinking

```tsx
import { Thinking } from "@/components/ui/thinking"

<Thinking />
<Thinking>Searching the docs…</Thinking>
```

- It's a `status`: screen readers hear its words once, not each frame. Remove it when the
  wait is over.
- It's the one piece that keeps moving, as progress does; under reduced motion it's still.

## Crossfade

```tsx
import { Crossfade } from "@/components/ui/crossfade"

<Crossfade value={plan}>
  <PlanDetails plan={plan} />
</Crossfade>
```

- When `value` changes, the new content takes the old one's place, and the box moves to the
  new content's height on the skin's move timing.
- The leaving content is inert and hidden from screen readers while it goes.

## Web Components

```html
<uiset-number-ticker value="12840" locale="en-US"></uiset-number-ticker>
<uiset-text-reveal text="An answer, a word at a time."></uiset-text-reveal>
<uiset-thinking>Searching the docs…</uiset-thinking>
<uiset-crossfade value="pro">
  <div data-value="free">…</div>
  <div data-value="pro">…</div>
</uiset-crossfade>
```

Set `value` or `text` (attribute or property) to move them. A ticker's `format` property takes
`Intl.NumberFormat` options or a function, and `from` counts up once when it's seen.

## Your own skin

The pieces read these from the skin's root (Base's values shown):

```css
--uiset-ticker-mode: roll; /* roll, count, type or none */
--uiset-ticker-duration: 700ms;
--uiset-ticker-ease: cubic-bezier(0.23, 1, 0.32, 1); /* linear, an ease or steps(n) when counting */
--uiset-reveal-by: word;
--uiset-reveal-duration: 360ms;
--uiset-reveal-stagger: 40ms;
--uiset-reveal-opacity: 0; /* and -shift, -clip, -color: where each piece starts from */
--uiset-reveal-caret: off;
--uiset-swap-duration: 220ms;
--uiset-swap-in-opacity: 0; /* and -in-clip, -out-opacity, -out-clip */
```
