import { cleanup } from "@solidjs/testing-library"
import { afterEach } from "vitest"

// Solid's testing library cleans up by itself only with Vitest's globals, which are off here.
afterEach(cleanup)
