import { useShortcutHint } from "@ui-sdk/solid/shortcuts"
import "../../registry/uiset/ui/shell/shell.css"

// Shows keys the way this platform writes them: ⌘K on Apple devices, Ctrl+K elsewhere.
function Kbd(props: { keys: string }) {
  const hint = useShortcutHint(() => props.keys)
  return <kbd class="kbd">{hint.text()}</kbd>
}

export { Kbd }
