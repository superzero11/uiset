import type { JSX } from "@solidjs/web"
import { Show } from "solid-js"
import { Button } from "./button"
import { Icon } from "./shell/icons"
import "../../registry/uiset/ui/shell/shell.css"

type Tone = "info" | "success" | "warning" | "danger"
const words: Record<Tone, string> = {
  info: "Note",
  success: "Success",
  warning: "Warning",
  danger: "Error",
}

// Static by default. Pass urgent for messages that appear in response to something and
// must interrupt (role="alert"); otherwise new messages are announced politely.
function Alert(props: { tone?: Tone; title?: string; children?: JSX.Element; actions?: JSX.Element; onDismiss?: () => void; urgent?: boolean; live?: boolean }) {
  const tone = () => props.tone ?? "info"
  return (
    <div class="alert" data-tone={tone()} role={props.urgent ? "alert" : props.live ? "status" : undefined}>
      <Icon name={tone()} class="alert-icon" />
      <div class="alert-body">
        <Show when={props.title}>
          {(title) => (
            <p class="alert-title">
              <span class="uiset-visually-hidden">{words[tone()]}: </span>
              {title()}
            </p>
          )}
        </Show>
        {/* Without a title, the text says the tone: "Warning: …". */}
        <Show when={props.children}>
          {(children) => (
            <div class="alert-text">
              <Show when={!props.title}>
                <span class="uiset-visually-hidden">{words[tone()]}: </span>
              </Show>
              {children()}
            </div>
          )}
        </Show>
        <Show when={props.actions}>{(actions) => <div class="alert-actions">{actions()}</div>}</Show>
      </div>
      <Show when={props.onDismiss}>
        {(dismiss) => (
          <Button variant="ghost" aria-label="Dismiss" class="alert-dismiss" onClick={() => dismiss()()}>
            <Icon name="close" />
          </Button>
        )}
      </Show>
    </div>
  )
}

export { Alert }
export type { Tone as AlertTone }
