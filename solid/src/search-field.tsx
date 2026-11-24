import type { ComponentProps } from "@solidjs/web"
import { createInputController, Input } from "@ui-sdk/solid/input"
import { useShortcut, useShortcutHint } from "@ui-sdk/solid/shortcuts"
import { createSignal, omit, Show } from "solid-js"
import { Button } from "./button"
import { Icon } from "./shell/icons"
import "../../registry/uiset/ui/shell/shell.css"

// A search box with an icon, a clear button and a key that focuses it from anywhere
// ("/" by default; plain keys never fire while someone is typing in another field).
// It skips InputGroup, which shows agents a second, unnamed component; the input already
// offers them its own "clear" action, so the visible clear button is hidden from them.
function SearchField(
  props: Omit<ComponentProps<typeof Input>, "type" | "controller"> & {
    label?: string
    shortcut?: string | null
  },
) {
  const controller = createInputController()
  const label = () => props.label ?? "Search"
  const shortcut = () => (props.shortcut === undefined ? "/" : props.shortcut)
  const [filled, setFilled] = createSignal(() => Boolean(props.value ?? props.defaultValue))
  useShortcut(shortcut, () => controller.focus(), () => ({ description: `Focus ${label().toLowerCase()}` }))
  const hint = useShortcutHint(() => shortcut() ?? "/")
  const rest = omit(props, "label", "shortcut", "onValueChange")
  return (
    <div class="search-field" data-filled={filled() ? "" : undefined}>
      <Icon name="search" class="search-field-icon" />
      <Input
        type="search"
        controller={controller}
        aria-label={label()}
        aria-keyshortcuts={shortcut() ? hint.ariaKeyshortcuts() : undefined}
        autocomplete="off"
        spellcheck={false}
        onValueChange={(value, details) => {
          setFilled(value !== "")
          props.onValueChange?.(value, details)
        }}
        {...rest}
      />
      <Show
        when={filled()}
        fallback={
          <Show when={shortcut()}>
            <kbd class="kbd search-field-hint" aria-hidden="true">
              {hint.text()}
            </kbd>
          </Show>
        }
      >
        <Button
          variant="ghost"
          class="search-field-clear"
          aria-label={`Clear ${label().toLowerCase()}`}
          data-agent-hidden=""
          onClick={() => {
            controller.clear()
            controller.focus()
          }}
        >
          <Icon name="close" />
        </Button>
      </Show>
    </div>
  )
}

export { SearchField }
