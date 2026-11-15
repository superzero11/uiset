import type { Script } from "./agent-panel"

const studioScript: Script[] = [
  {
    say: "Start the beat",
    steps: [{ ref: "Play", action: "setChecked", args: [true] }],
  },
  {
    say: "Make it darker",
    steps: [{ ref: "Cutoff", action: "setValue", args: [260] }],
  },
  {
    say: "Add a slow wobble to the filter",
    steps: [
      { ref: "Patch bay", action: "plug", args: ["LFO out", "Filter mod in"] },
      { ref: "Rate", action: "setValue", args: [1.5] },
      { ref: "Depth", action: "setValue", args: [75] },
    ],
  },
  {
    say: "Four on the floor",
    steps: [{ ref: "Pattern", action: "setValue", args: [["1", "5", "9", "13"]] }],
  },
  {
    say: "Speed it up",
    steps: [{ ref: "Tempo", action: "setValue", args: [148] }],
  },
  {
    say: "Make it plucky",
    steps: [
      { ref: "Patch bay", action: "plug", args: ["Envelope out", "Filter mod in"] },
      { ref: "Decay", action: "setValue", args: [120] },
    ],
  },
]

export { studioScript }
