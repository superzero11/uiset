import { render } from "@solidjs/web"
import { Components, exampleCount } from "./components-page"

// The page's own count, for its browser test to check every example drew.
document.body.dataset.examples = String(exampleCount)
render(() => <Components />, document.getElementById("app")!)
