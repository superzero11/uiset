import { cleanup } from "@solidjs/testing-library"
import { afterEach, beforeEach, expect, vi } from "vitest"

// Solid 2 reports its reactivity mistakes (a prop read once, an effect writing what it reads,
// a write relayed a frame late) as console warnings, and the browser checks fail on them. So
// does every Solid unit test: a warning or an error on the console fails the test it's in.
let said: string[] = []
beforeEach(() => {
  said = []
  for (const level of ["warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      said.push(`${level}: ${args.map(String).join(" ").slice(0, 300)}`)
    })
  }
})
// Solid's testing library cleans up by itself only with Vitest's globals, which are off here.
// The page goes first, so a failed check below never leaves it for the next test.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  expect(said, "Solid or UI SDK said this on the console").toEqual([])
})
