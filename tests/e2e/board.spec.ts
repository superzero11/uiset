import { boardTests } from "./board-tests"
import { openGallery } from "./gallery"

// The board kit on React's gallery; the tests are shared with Solid's board page (board-tests.ts).

boardTests({ open: (page) => openGallery(page, "/gallery") })
