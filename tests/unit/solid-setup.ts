import { cleanup } from "@solidjs/testing-library"
import { afterEach, beforeEach, expect, vi } from "vitest"

// Solid's testing library cleans up by itself only with Vitest's globals, which are off here.
afterEach(cleanup)

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
afterEach(() => {
  vi.restoreAllMocks()
  expect(said, "Solid or UI SDK said this on the console").toEqual([])
})
