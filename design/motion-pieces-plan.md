# Motion pieces: the plan

Planned and built on 2026-11-20, for 0.6.0 (the owner moved it up from the next day). Today's motion (`design/motion-plan.md`)
is how every part moves. These are pieces a page puts on purpose: the Library menu's
**Animate → Motion** ("Text, numbers, transitions, loaders"), now marked Coming soon.
Illustrations (animated scenes for landing pages) stay Coming soon; they come after.

## Why these four

AffectUI's motion page, the one the owner pointed to, has eight effects: Blur Crossfade,
Gradient Floor, Gradient Text, Grid Background, Number Ticker, Shimmer Loader, Text Reveal and
Tilt Card. Its page says nothing about reduced motion, and the effects look the same whatever
the theme. UISet takes the four that do a job in an app, and gives each skin its own way:

1. **Number ticker**: a number that moves to its new value, so a change is seen.
2. **Text reveal**: text that arrives a word or a letter at a time: an AI answer as it
   streams, a headline once.
3. **Thinking**: a loading state, the "Thinking…" line and the skeleton's sweep, in each
   skin's way (the chat kit's shimmer and `skeleton` become this).
4. **Crossfade**: content swapped in place, the box moving to the new content's size.

Left out: Tilt Card and Gradient Text (decoration that would look the same in every skin),
Gradient Floor and Grid Background (backgrounds belong with Illustrations, where Blueprint's
grid and Phosphor's scan lines can be scenes of their own).

## Each piece, per skin

| | Base | Blueprint | Studio | Phosphor | Ink |
| --- | --- | --- | --- | --- | --- |
| Number ticker | Digits roll like an odometer, easing out | Counts through the values at an even pace | Segments switch in hard steps, the lamp glowing as they change | Digits typed in from the left, with a caret | Redraws |
| Text reveal | Words rise a little and fade in | Drawn left to right, a word at a time | Lights up word by word | Typed with a caret | Appears |
| Thinking | A soft light sweeps across | Hatching moves along | An LED chase | A caret and dots that print one by one | Still dots; nothing moves |
| Crossfade | Fades across while the box glides to size | Wiped across from the start of the line | Hard cut; the box snaps to size | Scanned in top to bottom | Redraws |

Durations: a ticker counts in 400–800 ms (by how far it goes), a reveal shows a word every
30–60 ms, a crossfade takes the skin's move timing. These go past the 300 ms budget of
`design/motion-plan.md`, which is for parts people work with; a piece is placed on purpose,
and a count or a sentence needs that long to read.

## Rules every piece keeps

- **When it moves.** A ticker moves when its value changes; text reveals as it arrives (a
  stream) or once when it first shows; a crossfade when its content's key changes. Counting
  up on first view is an opt-in (`from`), and only when the piece scrolls into view. Nothing
  loops except Thinking, which is progress.
- **Reduced motion and `motion="reduce"`.** No movement: a ticker shows its new value, text
  appears whole, Thinking shows still dots, a crossfade swaps. Ink always behaves this way.
- **People and agents read the real value.** The ticker's accessible text is its final
  value, not the digits rolling past; revealed text is whole in the page from the start,
  only drawn in; Thinking says "Thinking…" once (a `status`), not on every frame.
- **Skins set variables, `base.css` and a small helper draw.** Each piece reads
  `--uiset-ticker-*`, `--uiset-reveal-*`, `--uiset-thinking-*` and the move tokens, so a
  nested skin moves its own way and an app's own skin can join in.
- **React and Web Components**, each piece a registry item (`number-ticker`, `text-reveal`,
  `thinking`, `crossfade`) and an element (`<uiset-number-ticker>` and so on).

## Shape, to start from

```tsx
<NumberTicker value={1284} format={{ style: "currency", currency: "USD" }} />
<NumberTicker value={users} from={0} />          // counts up once, when first seen
<TextReveal by="word">{answer}</TextReveal>       // reveals what's new as the text grows
<Thinking>Thinking…</Thinking>
<Crossfade value={step}>{content}</Crossfade>
```

`Stat` takes a `NumberTicker` as its value. The chat kit's response uses `TextReveal` while
streaming and `Thinking` while it waits, replacing `.chat-shimmer`.

## Checks before it ships

Per piece: an e2e test of each skin's timing and of reduced motion, an agent test (the value
an agent reads), axe in all skins and themes, a mutation check, filmstrips at full speed and
slowed down and zoomed (`research/motion/check-slow.mjs`, after the Blueprint check that read
as a fade), screenshots in all five skins, light and dark, React and Web Components. The site:
a Motion page under the Library, and the menu's Motion entry no longer Coming soon.
