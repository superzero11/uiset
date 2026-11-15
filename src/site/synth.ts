type Wave = "sawtooth" | "square" | "triangle"
type Patch = { from: string; to: string }

type SynthParams = {
  wave: Wave
  tune: number
  cutoff: number
  resonance: number
  attack: number
  decay: number
  lfoRate: number
  lfoDepth: number
  tempo: number
  level: number
  steps: string[]
  patches: Patch[]
}

// A minor pentatonic bassline, one note per step, in semitones from A1.
const melody = [0, 0, 12, 0, 7, 0, 10, 0, 3, 0, 12, 0, 7, 5, 3, 0]
const lookahead = 0.12
const tick = 25

class Synth {
  params: SynthParams
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private nextTime = 0
  private nextStep = 0
  private queue: { step: number; time: number }[] = []
  private samples: Float32Array<ArrayBuffer> | null = null

  constructor(params: SynthParams) {
    this.params = params
  }

  get playing() {
    return this.timer !== null
  }

  private audio() {
    if (this.ctx) return this.ctx
    const ctx = new AudioContext({ latencyHint: "interactive" })
    this.master = ctx.createGain()
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 512
    this.samples = new Float32Array(this.analyser.fftSize)
    this.master.connect(this.analyser).connect(ctx.destination)
    this.lfo = ctx.createOscillator()
    this.lfoGain = ctx.createGain()
    this.lfo.connect(this.lfoGain)
    this.lfo.start()
    this.ctx = ctx
    this.update({})
    return ctx
  }

  // Call from a user gesture: browsers keep audio suspended until one.
  unlock() {
    const ctx = this.audio()
    if (ctx.state === "suspended") void ctx.resume()
  }

  update(patch: Partial<SynthParams>) {
    Object.assign(this.params, patch)
    if (!this.ctx || !this.master || !this.lfo || !this.lfoGain) return
    const now = this.ctx.currentTime
    this.master.gain.setTargetAtTime((this.params.level / 100) ** 2 * 0.6, now, 0.02)
    this.lfo.frequency.setTargetAtTime(this.params.lfoRate, now, 0.02)
    this.lfoGain.gain.setTargetAtTime(this.params.lfoDepth / 100, now, 0.02)
  }

  start() {
    if (this.timer) return
    const ctx = this.audio()
    this.nextTime = ctx.currentTime + 0.05
    this.nextStep = 0
    this.timer = setInterval(() => this.schedule(), tick)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.queue = []
  }

  // Which step is sounding now, for the sequencer's playhead.
  currentStep() {
    if (!this.ctx || !this.timer) return null
    const now = this.ctx.currentTime
    while (this.queue.length > 1 && this.queue[1]!.time <= now) this.queue.shift()
    const head = this.queue[0]
    return head && head.time <= now ? head.step : null
  }

  // RMS of the output, 0 to 100.
  level() {
    if (!this.analyser || !this.samples) return 0
    this.analyser.getFloatTimeDomainData(this.samples)
    let sum = 0
    for (const sample of this.samples) sum += sample * sample
    return Math.min(100, Math.sqrt(sum / this.samples.length) * 260)
  }

  private patched(to: string, from?: string) {
    return this.params.patches.some((p) => p.to === to && (!from || p.from === from))
  }

  private schedule() {
    const ctx = this.ctx
    if (!ctx) return
    const stepLength = 60 / this.params.tempo / 4
    while (this.nextTime < ctx.currentTime + lookahead) {
      if (this.params.steps.includes(String(this.nextStep + 1))) {
        this.note(this.nextStep, this.nextTime, stepLength)
      }
      this.queue.push({ step: this.nextStep, time: this.nextTime })
      this.nextTime += stepLength
      this.nextStep = (this.nextStep + 1) % 16
    }
  }

  private note(step: number, time: number, length: number) {
    const ctx = this.ctx!
    const p = this.params
    const frequency = 55 * 2 ** ((melody[step]! + p.tune) / 12)

    const osc = ctx.createOscillator()
    osc.type = p.wave
    osc.frequency.value = frequency

    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.Q.value = p.resonance
    filter.frequency.setValueAtTime(p.cutoff, time)

    const vca = ctx.createGain()
    const attack = p.attack / 1000
    const decay = Math.max(p.decay / 1000, length)
    vca.gain.setValueAtTime(0.0001, time)
    vca.gain.exponentialRampToValueAtTime(0.5, time + attack)
    vca.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay)

    if (this.patched("cutoff:in", "env:out")) {
      const peak = Math.min(p.cutoff * 6, 12000)
      filter.frequency.setValueAtTime(p.cutoff, time)
      filter.frequency.exponentialRampToValueAtTime(peak, time + attack)
      filter.frequency.exponentialRampToValueAtTime(p.cutoff, time + attack + decay)
    }

    const wires: { node: GainNode; param: AudioParam }[] = []
    const wire = (param: AudioParam, amount: number) => {
      const node = ctx.createGain()
      node.gain.value = amount
      this.lfoGain!.connect(node).connect(param)
      wires.push({ node, param })
    }
    if (this.patched("cutoff:in", "lfo:out")) wire(filter.frequency, p.cutoff * 0.9)
    if (this.patched("pitch:in", "lfo:out")) wire(osc.detune, 120)
    if (this.patched("pitch:in", "env:out")) {
      osc.detune.setValueAtTime(1200, time)
      osc.detune.exponentialRampToValueAtTime(1, time + attack + decay * 0.5)
    }
    if (this.patched("level:in", "lfo:out")) wire(vca.gain, 0.4)

    osc.connect(filter).connect(vca).connect(this.master!)
    osc.start(time)
    const end = time + attack + decay + 0.05
    osc.stop(end)
    osc.onended = () => {
      for (const { node } of wires) node.disconnect()
      vca.disconnect()
    }
  }
}

export { Synth }
export type { Patch, SynthParams, Wave }
