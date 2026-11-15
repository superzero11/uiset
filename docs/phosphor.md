# Phosphor: design plan

**Subject.** A monochrome video terminal on a lab bench: a curved glass tube with green
phosphor glyphs, a faint bloom around bright text, scan lines you only notice up close,
a block cursor, and boxes drawn with line characters. **Audience.** Developers building
developer tools: CLIs in the browser, infrastructure consoles, logs, agents, and anyone
who wants their app to feel like a terminal. **Job.** The skin that makes developers
share a screenshot, and the natural partner of the Terminal kit.

Named Phosphor, not Terminal, so the skin never gets confused with the Terminal kit.

## Tokens

| Name    | Value                     | Role                                                      |
| ------- | ------------------------- | --------------------------------------------------------- |
| Tube    | `oklch(0.26 0.035 155)`   | The glass: a dark green-grey, never black                 |
| Raster  | `oklch(0.3 0.04 155)`     | Raised surfaces (popups, cards): a brighter scan area     |
| Dim     | `oklch(0.75 0.11 150)`    | Half-intensity text: secondary text, borders, placeholders |
| Glow    | `oklch(0.88 0.17 148)`    | Full-intensity text and the key color                     |
| Inverse | Glow fill, Tube text      | Selection, the chosen item, solid buttons                 |
| Signals | P3 amber `oklch(0.84 0.15 75)`, P22 red `oklch(0.75 0.16 28)`, P4 white `oklch(0.95 0.02 150)`, P7 blue `oklch(0.8 0.1 230)` | Data series and status, each a real phosphor type |

**Type.** One monospace for everything, because a terminal has one character grid:
"Spline Sans Mono", falling back to the platform's monospace. Body 14px with 1.5 line
height; headings are the same face at a heavier weight, never uppercase.

**Layout.** Everything aligns to the character grid: 0 radius, 1px Dim borders as if
drawn with box characters, spacing in multiples of half a line. Popups are a brighter
raster area with a Glow border, no shadow.

**Principles.**

1. The interface is monochrome. Color is intensity: Dim, Glow, and Inverse video. Only
   data and status use the other phosphors, so they stand out.
2. A chosen thing is drawn in inverse video: the selected day, the active tab, the
   checked switch track, the highlighted menu item, solid buttons.
3. Bright text blooms a little (a tight text-shadow on Glow text only). Scan lines are a
   static, very faint pattern on the background, never on text, and never animated; no
   flicker, no blinking except the text caret.
4. Focus is a 2px Glow outline offset by 2px, unmissable on the dark tube.
5. Sound is the `beep` voice: short square-wave chirps.
6. Forced colors drops bloom and scan lines; reduced transparency drops scan lines.

**Contrast** (computed). Glow on Tube 11.4:1, Dim on Tube 7.2:1, Tube on Glow (inverse)
11.4:1. Dim started at L 0.68 (5.6:1 on the tube); axe found it under 4.5:1 on tinted
surfaces (badges, avatar chips, event blocks), so it went up to L 0.75, which clears 4.5:1
on all of them; red went from 0.72 to 0.75 for the danger badge. Borders in Dim clear 3:1.

**Charts** (validated, `tests/unit/chart-palette.test.ts`): the tube's green, then blue,
P3 amber, P22 red, P4 white, lavender, cyan and pink, each 3:1 or more on the tube;
neighbors CVD ΔE ≥ 9.5 and normal ≥ 17, the first six pairwise CVD ≥ 9.4.

**As shipped.** Inside inverse video, quiet text and chips reverse too (a menu item's
hint, a tab's count). Code uses white for keywords, amber for strings and constants, blue
for functions, Dim for comments; the Terminal kit's ANSI colors are the phosphors.

**Review against generic defaults.** "Near-black with one acid-green accent" is a known
default. Phosphor differs on purpose: the background is a green-grey glass, not near
black; green is not an accent on neutral UI but the only ink, in intensity steps; the
signature is inverse video for selection, which defaults don't do; and the second colors
are named phosphors used only for data. Monospace here is the subject's own type, used
for everything rather than for small labels.
