import { openGallery } from "./gallery"
import { schedulerTests } from "./scheduler-tests"

// The scheduler kit on React's gallery; the tests are shared with Solid's scheduler page
// (scheduler-tests.ts).

schedulerTests({
  open: (page, search = "") => openGallery(page, `/gallery${search}`),
  example: (page) => page.locator("#example-scheduler").locator("xpath=ancestor::section[1]"),
})
