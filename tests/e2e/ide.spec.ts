import { ideTests } from "./ide-tests"

// The IDE kit on React's IDE app template; the tests are shared with Solid's IDE page
// (ide-tests.ts).

ideTests({ open: (page, search = "") => page.goto(`/templates/ide-app${search}`).then(() => undefined) })
