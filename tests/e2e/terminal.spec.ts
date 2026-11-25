import { openGallery } from "./gallery"
import { terminalTests } from "./terminal-tests"

// The terminal kit on React's gallery; the tests are shared with Solid's terminal page
// (terminal-tests.ts).

terminalTests({ open: (page, search = "") => openGallery(page, `/gallery${search}`) })
