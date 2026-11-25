import { canvasTests } from "./canvas-tests"
import { openGallery } from "./gallery"

// The canvas kit on React's gallery and kit page; the tests are shared with Solid's canvas page
// (canvas-tests.ts).

canvasTests({
  open: (page, search = "") => openGallery(page, `/gallery${search}`),
  kit: (page) => page.goto("/docs/kits/canvas").then(() => undefined),
})
