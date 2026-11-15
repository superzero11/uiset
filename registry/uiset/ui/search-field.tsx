"use client"

import { createInputController, Input } from "@ui-sdk/react/input"
import { useShortcut, useShortcutHint } from "@ui-sdk/react/shortcuts"
import { useMemo, useState, type ComponentProps } from "react"
import { Button } from "./button"
import { Icon } from "./shell/icons"
import "./shell/shell.css"

// A search box with an icon, a clear button and a key that focuses it from anywhere
// ("/" by default; plain keys never fire while someone is typing in another field).
// It skips InputGroup, which shows agents a second, unnamed component; the input already
// offers them its own "clear" action, so the visible clear button is hidden from them.
function SearchField({
  label = "Search",
  shortcut = "/",
  onValueChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "controller"> & {
  label?: string
  shortcut?: string | null
}) {
  const controller = useMemo(() => createInputController(), [])
  const [filled, setFilled] = useState(Boolean(props.value ?? props.defaultValue))
  useShortcut(shortcut, () => controller.focus(), {
    description: `Focus ${label.toLowerCase()}`,
  })
  const hint = useShortcutHint(shortcut ?? "/")

  return (
    <div className="search-field" data-filled={filled ? "" : undefined}>
      <Icon name="search" className="search-field-icon" />
      <Input
        type="search"
        controller={controller}
        aria-label={label}
        aria-keyshortcuts={shortcut ? hint.ariaKeyshortcuts : undefined}
        autoComplete="off"
        spellCheck={false}
        onValueChange={(value, details) => {
          setFilled(value !== "")
          onValueChange?.(value, details)
        }}
        {...props}
      />
      {filled ? (
        <Button
          variant="ghost"
          className="search-field-clear"
          aria-label={`Clear ${label.toLowerCase()}`}
          data-agent-hidden=""
          onClick={() => {
            controller.clear()
            controller.focus()
          }}
        >
          <Icon name="close" />
        </Button>
      ) : (
        shortcut && (
          <kbd className="kbd search-field-hint" aria-hidden="true">
            {hint.text}
          </kbd>
        )
      )}
    </div>
  )
}

export { SearchField }
