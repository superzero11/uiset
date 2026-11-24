import { hydrate } from "@solidjs/web"
import { pages } from "./pages"

const Page = pages[document.body.dataset.page ?? ""]
if (Page) hydrate(() => <Page />, document.getElementById("app")!)
