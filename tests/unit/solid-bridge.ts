import { createAgent } from "@ui-sdk/solid/agent"
import { flush } from "solid-js"
import { createBridge } from "./bridge"

// The agent bridge for Solid's tests. Solid applies a write on the next microtask (or a
// flush), so `settle` waits out timers under `ms`, then flushes what they wrote.

/** Lets timers under `ms` run, then applies Solid's queued updates. */
export const settle = async (ms = 50) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
  flush()
}

/** The same bridge React's tests use, on Solid's createAgent. */
export const createSolidBridge = () => createBridge(createAgent as Parameters<typeof createBridge>[0], settle)
