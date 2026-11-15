"use client"

import { useShortcutHint } from "@ui-sdk/react/shortcuts"
import "./shell/shell.css"

// Shows keys the way this platform writes them: ⌘K on Apple devices, Ctrl+K elsewhere.
function Kbd({ keys }: { keys: string }) {
  const hint = useShortcutHint(keys)
  return <kbd className="kbd">{hint.text}</kbd>
}

export { Kbd }
