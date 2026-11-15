# Blueprint

A technical drawing: cyanotype paper, white linework, hatching for filled states,
dimension lines for slider tracks, and lettering for labels. It was the first themed skin,
built to prove that a skin can change everything about how UI SDK's components look while
changing nothing about how they behave.

```tsx
<UISet skin="blueprint">…</UISet>
```

## Tokens

| Name   | Value                         | Role                                                   |
| ------ | ----------------------------- | ------------------------------------------------------ |
| Paper  | `oklch(0.36 0.11 254)`        | The page: a deep cyanotype blue                        |
| Line   | `oklch(0.96 0.02 230)`        | Text, borders, fills: drawn in white                   |
| Faint  | Line at 16%                   | Hover fills and the fine grid                          |
| Grid   | Line at 7%                    | The 8px and 64px drawing grid on the paper             |
| Ring   | `oklch(0.9 0.13 200)`         | Focus: a cyan line, distinct from the white drawing    |

**Type.** Barlow Semi Condensed; labels and buttons in spaced capitals, like drafting
lettering.

**Drawing language.**

- Text boxes are a line to write on, not a box.
- Checked and filled states are hatched, not filled solid: a switch's track, a slider's
  range.
- Slider tracks are dimension lines with end ticks; the thumb is a diamond.
- Popups are a sheet laid on the drawing, with an offset shadow line.
- What isn't reached yet (an empty star, an upcoming step) is drawn faint.

**Scheme.** Dark only: `theme` doesn't change it.

**Contrast.** White linework on the paper clears 4.5:1 for text and 3:1 for every control
edge; the chart colors are a set chosen for the blue paper and checked for color blindness
(neighbors CVD ΔE ≥ 14.6).
