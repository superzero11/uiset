# Studio: design plan

**Subject.** A rack of synthesizer modules on a studio desk: painted metal faceplates,
rubber knob caps, silk-screened legends, amber indicator lamps and patch cables.
**Audience.** Developers building music, audio and creative tools, and anyone who wants
an interface that feels like hardware. **Job.** The demo that makes the skin system
obvious: the same UI SDK components, turned into instruments you can hear.

Not SPEC-01 (light molded pocket instruments, LCDs, orange-red keys). Studio is darker,
rack-mounted, metal and rubber, with color reserved for cables and lamps.

## Tokens

| Name   | Value                           | Role                                    |
| ------ | ------------------------------- | --------------------------------------- |
| Rack   | `oklch(0.25 0.01 255)`          | Rails and the gaps between modules      |
| Panel  | `oklch(0.34 0.012 255)`         | Module faceplates (gunmetal, not black) |
| Legend | `oklch(0.94 0.012 85)`          | Silk-screened text and scales           |
| Rubber | `oklch(0.19 0.006 255)`         | Knob caps, pads                         |
| Lamp   | `oklch(0.82 0.15 72)`           | The key color: lit state, value arcs    |
| Cables | red, blue, green, amber, violet | Which cable is which                    |

**Type.** Saira Semi Condensed. Legends are small and uppercase because that is how
faceplates are printed; readouts use tabular numerals. Body copy stays sentence case.

**Layout.** Modules sit side by side on a rack, each with screws at the corners and its
name at the top. Controls on a grid, jacks along the bottom, cables drape over all of it.

**Principles.**

1. Spend boldness on the cables and the lamps. Panels stay quiet.
2. Every state a person sets lights something: a switch lamp, a step, a knob arc.
3. Depth is a 1px top highlight and a bottom shadow, never a blur haze. Forced colors
   replaces all of it with borders.
4. Sound is mechanical: thocks for pads, detent clicks for knobs, latches for switches.

**Scheme.** Dark only: `theme` doesn't change it.

**Review against generic defaults.** Dark UI with one accent is a common default; here
the panel is mid-dark gunmetal, the lamp color comes from real indicator lamps, and the
five cable colors carry meaning. Uppercase is limited to printed legends.
