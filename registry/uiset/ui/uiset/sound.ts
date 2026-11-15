type Cue =
  | "press"
  | "release"
  | "on"
  | "off"
  | "tick"
  | "select"
  | "open"
  | "close"
  | "key"
  | "error"

type Profile = "soft" | "mechanical" | "beep" | "paper"

type PlayOptions = {
  profile: Profile
  volume: number
  pitch?: number
}

let context: AudioContext | null = null
let output: GainNode | null = null
let noise: AudioBuffer | null = null

function audio() {
  if (context) return context
  if (typeof AudioContext === "undefined") return null
  context = new AudioContext({ latencyHint: "interactive" })
  output = context.createGain()
  const limiter = context.createDynamicsCompressor()
  limiter.threshold.value = -10
  limiter.ratio.value = 12
  output.connect(limiter).connect(context.destination)
  noise = context.createBuffer(1, context.sampleRate * 0.25, context.sampleRate)
  const samples = noise.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  return context
}

// Browsers keep audio suspended until a user gesture, so this runs from one.
function unlockAudio() {
  const ctx = audio()
  if (ctx && ctx.state === "suspended") void ctx.resume()
}

function envelope(ctx: AudioContext, peak: number, attack: number, decay: number) {
  const gain = ctx.createGain()
  const now = ctx.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), now + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay)
  return gain
}

function tone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  level: number,
  type: OscillatorType = "sine",
  glideTo?: number,
  delay = 0,
) {
  const oscillator = ctx.createOscillator()
  const start = ctx.currentTime + delay
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  if (glideTo)
    oscillator.frequency.exponentialRampToValueAtTime(glideTo, start + duration)
  const gain = envelope(ctx, level, 0.002, duration)
  oscillator.connect(gain).connect(output!)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function burst(
  ctx: AudioContext,
  duration: number,
  frequency: number,
  q: number,
  level: number,
  sweepTo?: number,
) {
  const source = ctx.createBufferSource()
  source.buffer = noise
  source.playbackRate.value = 0.9 + Math.random() * 0.2
  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.value = frequency
  filter.Q.value = q
  if (sweepTo) {
    filter.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration)
  }
  const gain = envelope(ctx, level, 0.001, duration)
  source.connect(filter).connect(gain).connect(output!)
  source.start()
  source.stop(ctx.currentTime + duration + 0.02)
}

type Voice = (ctx: AudioContext, pitch: number) => void

const voices: Record<Profile, Partial<Record<Cue, Voice>>> = {
  soft: {
    press: (ctx) => {
      burst(ctx, 0.012, 3200, 1.2, 0.22)
      tone(ctx, 190, 0.028, 0.16)
    },
    release: (ctx) => burst(ctx, 0.008, 4400, 1.6, 0.1),
    on: (ctx) => tone(ctx, 620, 0.06, 0.14, "sine", 930),
    off: (ctx) => tone(ctx, 620, 0.06, 0.12, "sine", 410),
    tick: (ctx, pitch) => tone(ctx, 1300 + 700 * pitch, 0.012, 0.07),
    select: (ctx) => {
      burst(ctx, 0.01, 3000, 1, 0.12)
      tone(ctx, 880, 0.035, 0.08)
    },
    open: (ctx) => burst(ctx, 0.07, 900, 0.8, 0.07, 2600),
    close: (ctx) => burst(ctx, 0.06, 2400, 0.8, 0.06, 800),
    key: (ctx) => burst(ctx, 0.006, 5200, 2, 0.06),
    error: (ctx) => {
      tone(ctx, 240, 0.08, 0.14, "triangle")
      tone(ctx, 200, 0.1, 0.14, "triangle", undefined, 0.1)
    },
  },
  mechanical: {
    press: (ctx) => {
      burst(ctx, 0.02, 1700, 0.8, 0.42)
      tone(ctx, 95, 0.05, 0.34)
    },
    release: (ctx) => {
      burst(ctx, 0.012, 2800, 1.2, 0.26)
      tone(ctx, 140, 0.02, 0.12)
    },
    on: (ctx) => {
      burst(ctx, 0.016, 2200, 1, 0.38)
      tone(ctx, 150, 0.04, 0.26, "triangle")
    },
    off: (ctx) => {
      burst(ctx, 0.016, 1600, 1, 0.34)
      tone(ctx, 110, 0.04, 0.24, "triangle")
    },
    tick: (ctx, pitch) => burst(ctx, 0.005, 2200 + 2400 * pitch, 5, 0.16),
    select: (ctx) => {
      burst(ctx, 0.014, 2000, 1.4, 0.3)
      tone(ctx, 120, 0.03, 0.18)
    },
    open: (ctx) => burst(ctx, 0.05, 700, 1, 0.12, 1800),
    close: (ctx) => burst(ctx, 0.04, 1800, 1, 0.1, 600),
    key: (ctx) => burst(ctx, 0.01, 2600, 1.5, 0.2),
    error: (ctx) => tone(ctx, 110, 0.14, 0.3, "square"),
  },
  beep: {
    press: (ctx) => tone(ctx, 1180, 0.02, 0.05, "square"),
    release: (ctx) => tone(ctx, 1580, 0.012, 0.03, "square"),
    on: (ctx) => {
      tone(ctx, 990, 0.03, 0.05, "square")
      tone(ctx, 1480, 0.04, 0.05, "square", undefined, 0.035)
    },
    off: (ctx) => {
      tone(ctx, 1480, 0.03, 0.05, "square")
      tone(ctx, 990, 0.04, 0.05, "square", undefined, 0.035)
    },
    tick: (ctx, pitch) => tone(ctx, 700 + 900 * pitch, 0.008, 0.035, "square"),
    select: (ctx) => tone(ctx, 1320, 0.025, 0.05, "square"),
    open: (ctx) => tone(ctx, 660, 0.05, 0.04, "square", 1320),
    close: (ctx) => tone(ctx, 1320, 0.05, 0.04, "square", 660),
    key: (ctx) => tone(ctx, 1760, 0.008, 0.025, "square"),
    error: (ctx) => {
      tone(ctx, 330, 0.07, 0.06, "square")
      tone(ctx, 330, 0.07, 0.06, "square", undefined, 0.1)
    },
  },
  paper: {
    press: (ctx) => burst(ctx, 0.03, 900, 0.5, 0.2),
    release: (ctx) => burst(ctx, 0.02, 1400, 0.6, 0.08),
    on: (ctx) => burst(ctx, 0.04, 1200, 0.7, 0.18, 2200),
    off: (ctx) => burst(ctx, 0.04, 2200, 0.7, 0.16, 1100),
    tick: (ctx, pitch) => burst(ctx, 0.008, 1500 + 1200 * pitch, 0.9, 0.06),
    select: (ctx) => burst(ctx, 0.025, 1600, 0.6, 0.16),
    open: (ctx) => burst(ctx, 0.12, 600, 0.4, 0.1, 2000),
    close: (ctx) => burst(ctx, 0.1, 2000, 0.4, 0.08, 600),
    key: (ctx) => burst(ctx, 0.012, 2600, 0.8, 0.08),
    error: (ctx) => burst(ctx, 0.08, 400, 0.6, 0.22),
  },
}

function isProfile(value: string): value is Profile {
  return value in voices
}

function play(cue: Cue, { profile, volume, pitch = 0.5 }: PlayOptions) {
  const ctx = audio()
  if (!ctx || ctx.state !== "running" || !output) return
  const voice = voices[profile][cue]
  if (!voice) return
  output.gain.value = Math.min(Math.max(volume, 0), 1)
  voice(ctx, Math.min(Math.max(pitch, 0), 1))
}

export { isProfile, play, unlockAudio }
export type { Cue, Profile }
