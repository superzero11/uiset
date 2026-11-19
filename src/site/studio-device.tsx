import { useEffect, useRef, useState } from "react"
import { Fader } from "@/registry/uiset/ui/fader"
import { Knob } from "@/registry/uiset/ui/knob"
import { LevelMeter } from "@/registry/uiset/ui/level-meter"
import { PatchBay, PatchBayJack, type Cable } from "@/registry/uiset/ui/patch-bay"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/registry/uiset/ui/segmented-control"
import { StepSequencer } from "@/registry/uiset/ui/step-sequencer"
import { Switch } from "@/registry/uiset/ui/switch"
import { Synth, type SynthParams, type Wave } from "./synth"

const ports = {
  "lfo:out": "LFO out",
  "env:out": "Envelope out",
  "cutoff:in": "Filter mod in",
  "pitch:in": "Pitch mod in",
  "level:in": "Amp mod in",
}

const waves: { value: Wave; label: string; path: string }[] = [
  { value: "sawtooth", label: "Saw", path: "M1 11 L8 1 V11 L15 1 V11 L22 1 V11" },
  { value: "square", label: "Square", path: "M1 11 V1 H7 V11 H13 V1 H19 V11 H23" },
  { value: "triangle", label: "Triangle", path: "M1 11 L6 1 L12 11 L18 1 L23 11" },
]

const hz = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`
const ms = (value: number) => `${Math.round(value)} ms`

const synth = new Synth({
  wave: "sawtooth",
  tune: 0,
  cutoff: 900,
  resonance: 6,
  attack: 4,
  decay: 260,
  lfoRate: 2,
  lfoDepth: 40,
  tempo: 112,
  level: 70,
  steps: ["1", "3", "5", "7", "9", "11", "13", "14", "15"],
  patches: [],
})

function Jack({ port }: { port: keyof typeof ports }) {
  return (
    <span className="rack-jack">
      <PatchBayJack port={port} label={ports[port]} />
      <span aria-hidden="true">{ports[port].replace(/ (in|out)$/, "")}</span>
      <span aria-hidden="true" className="rack-jack-kind">
        {port.endsWith(":out") ? "out" : "in"}
      </span>
    </span>
  )
}

function useSynthParam<K extends keyof SynthParams>(key: K) {
  const [value, setValue] = useState(synth.params[key])
  const set = (next: SynthParams[K]) => {
    setValue(next)
    synth.update({ [key]: next } as Partial<SynthParams>)
  }
  return [value, set] as const
}

function StudioDevice() {
  const [wave, setWave] = useSynthParam("wave")
  const [tune, setTune] = useSynthParam("tune")
  const [cutoff, setCutoff] = useSynthParam("cutoff")
  const [resonance, setResonance] = useSynthParam("resonance")
  const [attack, setAttack] = useSynthParam("attack")
  const [decay, setDecay] = useSynthParam("decay")
  const [lfoRate, setLfoRate] = useSynthParam("lfoRate")
  const [lfoDepth, setLfoDepth] = useSynthParam("lfoDepth")
  const [tempo, setTempo] = useSynthParam("tempo")
  const [level, setLevel] = useSynthParam("level")
  const [steps, setSteps] = useSynthParam("steps")
  const [patches, setPatches] = useSynthParam("patches")
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState<number | null>(null)
  const [signal, setSignal] = useState(0)
  const frame = useRef(0)

  useEffect(() => {
    if (!playing) {
      setCurrent(null)
      setSignal(0)
      return
    }
    let count = 0
    const loop = () => {
      setCurrent(synth.currentStep())
      if (count++ % 3 === 0) setSignal(Math.round(synth.level()))
      frame.current = requestAnimationFrame(loop)
    }
    frame.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame.current)
  }, [playing])

  useEffect(() => () => synth.stop(), [])

  return (
    <div className="rack" onPointerDown={() => synth.unlock()}>
      <PatchBay
        aria-label="Patch bay"
        labels={ports}
        value={patches}
        onValueChange={(next: Cable[]) => setPatches(next)}
        className="rack-modules"
      >
        <section className="rack-module" aria-labelledby="osc-title">
          <h3 id="osc-title">Oscillator</h3>
          <SegmentedControl
            aria-label="Wave"
            value={wave}
            onValueChange={(value) => value && setWave(value as Wave)}
          >
            {waves.map((item) => (
              <SegmentedControlItem key={item.value} value={item.value}>
                <svg viewBox="0 0 24 12" aria-hidden="true" className="wave-glyph">
                  <path d={item.path} />
                </svg>
                <span className="visually-hidden">{item.label}</span>
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          <div className="rack-knobs">
            <Knob
              label="Tune"
              min={-12}
              max={12}
              value={tune}
              onValueChange={setTune}
              format={(v) => `${v > 0 ? "+" : ""}${v} st`}
            />
          </div>
          <div className="rack-jacks">
            <Jack port="pitch:in" />
          </div>
        </section>

        <section className="rack-module" aria-labelledby="filter-title">
          <h3 id="filter-title">Filter</h3>
          <div className="rack-knobs">
            <Knob
              label="Cutoff"
              min={80}
              max={8000}
              step={1}
              scale="log"
              value={cutoff}
              onValueChange={setCutoff}
              format={hz}
            />
            <Knob
              label="Resonance"
              min={0}
              max={20}
              step={0.5}
              value={resonance}
              onValueChange={setResonance}
            />
          </div>
          <div className="rack-jacks">
            <Jack port="cutoff:in" />
          </div>
        </section>

        <section className="rack-module" aria-labelledby="env-title">
          <h3 id="env-title">Envelope</h3>
          <div className="rack-knobs">
            <Knob
              label="Attack"
              min={1}
              max={500}
              scale="log"
              value={attack}
              onValueChange={setAttack}
              format={ms}
            />
            <Knob
              label="Decay"
              min={40}
              max={1500}
              scale="log"
              value={decay}
              onValueChange={setDecay}
              format={ms}
            />
          </div>
          <div className="rack-jacks">
            <Jack port="env:out" />
          </div>
        </section>

        <section className="rack-module" aria-labelledby="lfo-title">
          <h3 id="lfo-title">LFO</h3>
          <div className="rack-knobs">
            <Knob
              label="Rate"
              min={0.1}
              max={12}
              step={0.1}
              scale="log"
              value={lfoRate}
              onValueChange={setLfoRate}
              format={hz}
            />
            <Knob
              label="Depth"
              min={0}
              max={100}
              value={lfoDepth}
              onValueChange={setLfoDepth}
              format={(v) => `${v}%`}
            />
          </div>
          <div className="rack-jacks">
            <Jack port="lfo:out" />
          </div>
        </section>

        <section className="rack-module" aria-labelledby="out-title">
          <h3 id="out-title">Output</h3>
          <div className="rack-row">
            <Fader
              label="Master"
              value={level}
              onValueChange={(v) => setLevel(v as number)}
            />
            <div className="fader-field">
              <div className="rack-meter-box">
                <LevelMeter label="Signal" value={signal} className="rack-meter" />
              </div>
              <span className="fader-label" aria-hidden="true">
                Signal
              </span>
            </div>
          </div>
          <div className="rack-jacks">
            <Jack port="level:in" />
          </div>
        </section>
        <section className="rack-module rack-module-wide" aria-labelledby="seq-title">
          <h3 id="seq-title">Sequencer</h3>
          <div className="rack-row">
            <label className="rack-play">
              <Switch
                checked={playing}
                onCheckedChange={(on) => {
                  synth.unlock()
                  if (on) synth.start()
                  else synth.stop()
                  setPlaying(on)
                }}
              />
              Play
            </label>
            <Knob
              label="Tempo"
              min={60}
              max={180}
              value={tempo}
              onValueChange={setTempo}
              format={(v) => `${v} bpm`}
            />
          </div>
          <StepSequencer
            label="Pattern"
            value={steps}
            onValueChange={setSteps}
            current={current}
          />
        </section>
      </PatchBay>
      <p className="rack-hint">
        Drag a cable from an out jack to an in jack. With the keyboard, focus an out jack,
        press Enter, choose an input with the arrow keys and press Enter again.
        Double-click a knob to reset it.
      </p>
    </div>
  )
}

export { StudioDevice, synth }
