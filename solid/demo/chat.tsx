import { render } from "@solidjs/web"
import { DemoPage } from "./demo-page"
import { ChatDemo } from "./kits/chat-demo"
import "./kits.css"

render(
  () => (
    <DemoPage title="Chat in Solid" description="The chat kit in Solid 2: threads, the conversation, an agent's turn from AI SDK parts, a queue and the composer, as on the React kit page.">
      <div class="chat-stage">
        <ChatDemo />
      </div>
    </DemoPage>
  ),
  document.getElementById("app")!,
)
