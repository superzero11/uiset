# Ink: design plan

**Subject.** An electronic-paper reader: a matte, light grey screen, crisp black type,
greys made of fine dots, and pages that change by redrawing rather than animating.
**Audience.** Reading and writing apps, documentation, note-taking and focus tools, and
products that want the calmest, highest-contrast interface with no motion at all.
**Job.** The first light themed skin, and proof that the system works with no color.

Named Ink, after the medium, rather than any e-reader brand.

## Tokens

| Name   | Value                  | Role                                                        |
| ------ | ---------------------- | ----------------------------------------------------------- |
| Screen | `oklch(0.95 0 0)`      | The paper: a neutral light grey, not white and not cream    |
| Ink    | `oklch(0.2 0 0)`       | Text, borders, solid fills: the only "color"                |
| Grey   | `oklch(0.42 0 0)`      | Secondary text (7.3:1 on Screen)                            |
| Tint   | `oklch(0.88 0 0)`      | Quiet fills: hover, muted surfaces, tracks                  |
| Dots   | a 2px dot screen of Ink on Screen | Mid-grey fills (progress, chart series, range middles) drawn as dither, the way the medium does it |
| Hatch  | 45° lines of Ink       | A second fill texture, for danger and for a second data series |

**Type.** Two faces with distinct jobs. "Literata", a typeface designed for reading on
screens, for headings and long text; "Atkinson Hyperlegible", designed for legibility,
for controls, labels and data. Body 16px; serif text gets 1.6 line height, controls 1.4.

**Layout.** Calm and flat: 1.5px Ink borders on controls, 6px radius, generous padding,
no shadows. Popups are Screen with a 2px Ink border, so they read as a sheet laid on top.

**Principles.**

1. No color, so meaning never depends on it. Status pairs an icon and a word with a fill
   pattern: solid for success, dots for warning, hatch for danger.
2. No motion. Every transition and animation duration is zero, whatever the person's
   motion setting; a change is a redraw.
3. Chosen things are solid Ink with Screen text: the selected day, checked boxes, the
   active segment, solid buttons. Hover is the Tint fill.
4. Focus is a 3px Ink outline offset by 2px.
5. Sound is the `paper` voice, quiet; haptics stay on where the device has them.
6. Forced colors maps straight across, since the skin already avoids color.

**Contrast** (computed). Ink on Screen 15.6:1, Grey on Screen 7.3:1 and on Tint 5.9:1,
Screen on Ink (inverse) 15.6:1; Ink borders clear 3:1 easily.

**Review against generic defaults.** A light skin with a serif risks the "cream paper,
serif display, terracotta accent" default. Ink avoids each part: the screen is a neutral
grey, not warm; there is no accent color at all; the serif is a reading face used for
reading, paired with a legibility face for controls; and greys are dot screens rather
than flat tints. It's flat but not broadsheet: radius stays 6px and there are no
hairline column rules.

**As shipped** (2026-11-15).

- **Data is the one exception to "no color."** The plan drew chart series as dots and
  hatching, but the chart kit fills marks with a color per series and has no patterns, so
  a legend could not show which pattern is which. Charts and calendar events take a muted,
  print-like set instead, like a color e-paper panel: ink, blue, orange, sage, dark red,
  purple, teal, mustard, each 3:1 or more on the screen; neighbors CVD ΔE ≥ 9.8 and
  normal ≥ 16, the first six pairwise (`tests/unit/chart-palette.test.ts`). The interface
  itself stays ink only.
- Body text is 15px (0.9375rem), not 16px: at 16px the denser kits (data grid, IDE,
  scheduler) cramped. Rich text and chat answers get the 1.6 line height.
- Status: solid bars for information and success, dots for warnings, hatching for danger,
  each with its icon and word. A destructive button is framed in a double rule; an invalid
  field has a dashed edge.
- An empty rating star is a screen of dots; a loading skeleton is dots, not a shimmer.
- Code is set in ink and grey. Inside a solid (selected) row, quiet text reverses to a
  light grey.
- No motion is set inside the skin, so it holds whatever the motion setting.

