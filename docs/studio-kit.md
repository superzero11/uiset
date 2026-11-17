# Studio

Instruments built from UI SDK behaviors: a knob, a patch bay with cables, a fader, a level
meter and a step sequencer. They make creative and audio tools, and they're the clearest
demo of what a skin does: put them in the Studio skin and they look and sound like a rack.

```bash
npx shadcn@latest add @uiset/knob @uiset/patch-bay @uiset/fader @uiset/level-meter @uiset/step-sequencer
```

## Parts

| Part                       | Item             | What it is                                                         |
| -------------------------- | ---------------- | ------------------------------------------------------------------ |
| `Knob`                     | `knob`           | A rotary control, built as a UI SDK primitive: drag, keys, log scales, double-click to reset |
| `PatchBay`, `PatchBayJack` | `patch-bay`      | Jacks and the cables between them, by drag or by keyboard           |
| `Fader`                    | `fader`          | UI SDK's vertical Slider with its label and readout                 |
| `LevelMeter`               | `level-meter`    | UI SDK's Meter drawn as a ladder of lamps                           |
| `StepSequencer`            | `step-sequencer` | A row of steps on UI SDK's ToggleGroup, with downbeats and a playhead |

## Use

```tsx
import { useState } from "react"
import { Fader } from "@/components/ui/fader"
import { Knob } from "@/components/ui/knob"
import { LevelMeter } from "@/components/ui/level-meter"
import { PatchBay, PatchBayJack, type Cable } from "@/components/ui/patch-bay"
import { StepSequencer } from "@/components/ui/step-sequencer"
import { UISet } from "@/components/ui/uiset"

export function Synth() {
  const [cutoff, setCutoff] = useState(900)
  const [cables, setCables] = useState<Cable[]>([])
  const [pattern, setPattern] = useState<string[]>(["1", "5", "9", "13"])
  return (
    <UISet skin="studio" sound>
      <PatchBay aria-label="Patch bay" value={cables} onValueChange={setCables}>
        <Knob
          label="Cutoff"
          min={20}
          max={20000}
          scale="log"
          value={cutoff}
          onValueChange={setCutoff}
          format={(hz) => `${Math.round(hz)} Hz`}
        />
        <PatchBayJack port="lfo:out" label="LFO out" />
        <PatchBayJack port="filter:in" label="Filter in" />
        <Fader label="Master" defaultValue={70} />
        <LevelMeter label="Signal" value={60} />
        <StepSequencer label="Pattern" value={pattern} onValueChange={setPattern} current={4} />
      </PatchBay>
    </UISet>
  )
}
```

- **Knob** takes `value` or `defaultValue`, `min`, `max`, `step`, `largeStep`,
  `scale="linear" | "log"`, `format` (an `Intl.NumberFormat` options object or a
  function) and `locale`. `onValueChange` fires as it turns and `onValueCommit` when it
  settles. `hideLabel` and `hideValue` hide the visible label or readout (the label stays
  the knob's name).
- **PatchBay** owns the cables: `value` or `defaultValue` (`{ from, to }[]`) and
  `onValueChange`. A jack's `port` ends in `:out` or `:in`, and cables run from an out to an
  in. `labels` maps ports to names for agents and descriptions; jacks' labels fill it in.
- **Fader** is a vertical `Slider` with `label`; **LevelMeter** is a `Meter` with `label`
  and `value`.
- **StepSequencer** is a multiple `ToggleGroup`: `value` is the steps that are on, `steps`
  (16 by default), `current` the playhead's index, `stepLabel(step)` each step's name.

## Keys

| Keys                    | Does                                                    |
| ----------------------- | ------------------------------------------------------- |
| Arrow keys              | Turn a knob, move a fader, move along the sequencer     |
| Page Up, Page Down      | Turn a knob by its large step                           |
| Home, End               | A knob's minimum or maximum                             |
| Double-click            | Reset a knob                                            |
| Enter on an out jack    | Start a cable; arrows choose an input; Enter plugs it   |
| Space                   | Turn a sequencer step on or off                         |

Every change reads out to screen readers: a knob says its formatted value, a jack says
what it's patched to.

## For agents

Knobs offer `setValue`, `increment`, `decrement` and `reset`; the patch bay offers `plug`,
`unplug` and `clear`, and lists its ports. Faders, meters and the sequencer are UI SDK's
slider, meter and toggle group, with their own actions. The [Kits page](/kits#studio) has
an agent playing the rack from prompts like "make it darker".

## Skin and sound

These work in any skin; the Studio skin draws them as hardware (see
[Studio's design notes](/docs/skins/studio)). With `sound` on the root, turning and
plugging make short mechanical sounds.
