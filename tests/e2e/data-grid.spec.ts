import { dataGridTests } from "./data-grid-tests"

// The data grid kit on React's kit page; the tests are shared with Solid's (data-grid-tests.ts).

dataGridTests({ open: (page) => page.goto("/docs/kits/data-grid").then(() => undefined), frame: ".item-frame" })
