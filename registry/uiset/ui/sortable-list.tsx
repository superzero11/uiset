"use client"

import { createParts, type PartProps } from "@ui-sdk/react/primitive"
import { useCallback, useId, useMemo, type ReactNode } from "react"
import { keepDragPreviewInside } from "./shell/drag-preview"
import { Icon } from "./shell/icons"
import { sortableList, type SortableListOptions } from "./sortable-list/sortable-list"
import "./shell/shell.css"
import "./sortable-list/sortable-list.css"

const parts = createParts(sortableList, { root: "div", item: "div" })

type SortableListItem = {
  value: string
  label: string
  description?: string
  /** Stays where it is. Other items move past it. */
  locked?: boolean
}

type SortableListItemState = { moving: boolean; dragging: boolean; selected: boolean; locked: boolean }

type SortableListProps = Omit<SortableListOptions, "keys" | "itemLabel" | "locked"> &
  Omit<PartProps<"div">, "defaultValue" | "onChange" | "children" | "aria-label"> & {
    /** What the list holds, like "Playlist". It names the list for people and agents. */
    label: string
    items: SortableListItem[]
    /** Shows each item's place, 1 first. */
    numbered?: boolean
    /** An item's face, in place of its label and description. */
    renderItem?: (item: SortableListItem, state: SortableListItemState) => ReactNode
    /** How to move items, read out once with the list. Defaults to English. */
    help?: string
  }

const helpText = (multiple: boolean) =>
  "Space picks an item up, the arrow keys move it, Space drops it and Escape puts it back." +
  (multiple ? " Shift+Space selects items to move together, and Shift with the arrow keys selects a run." : "")

/**
 * A list people put in order: drag an item by its grip, or focus it, press Space, move it
 * with the arrows and press Space again. With `multiple`, a selection moves together.
 */
function SortableList({ label, items, numbered = false, renderItem, help, multiple = false, className, ...props }: SortableListProps) {
  const baseId = useId()
  const helpId = `${baseId}-help`
  const byKey = useMemo(() => new Map(items.map((item, index) => [item.value, { item, index }])), [items])
  const keys = useMemo(() => items.map((item) => item.value), [items])
  const itemLabel = useCallback((key: string) => byKey.get(key)?.item.label ?? key, [byKey])
  const locked = useCallback((key: string) => !!byKey.get(key)?.item.locked, [byKey])
  const keepPreview = useCallback((el: HTMLElement | null) => (el ? keepDragPreviewInside(el) : undefined), [])
  const described = [props["aria-describedby"], helpId].filter(Boolean).join(" ")

  return (
    <parts.Root
      {...props}
      ref={keepPreview}
      keys={keys}
      multiple={multiple}
      itemLabel={itemLabel}
      locked={locked}
      aria-label={label}
      aria-describedby={described}
      className={["sortable-list", numbered && "sortable-list-numbered", className].filter(Boolean).join(" ")}
    >
      {({ order }) => (
        <>
          <p id={helpId} hidden>
            {help ?? helpText(multiple)}
          </p>
          {order.map((key, position) => {
            const entry = byKey.get(key)
            if (!entry) return null
            const { item, index } = entry
            const descriptionId = item.description ? `${baseId}-${index}` : undefined
            return (
              <parts.Item key={key} value={key} className="sortable-list-item" aria-label={item.label} aria-describedby={descriptionId}>
                {(state: SortableListItemState) =>
                  renderItem ? (
                    renderItem(item, state)
                  ) : (
                    <>
                      <span className="sortable-list-handle" data-sortable-handle="" aria-hidden="true">
                        <Icon name={item.locked ? "lock" : "grip"} />
                      </span>
                      {multiple && !item.locked && (
                        <span className="sortable-list-check" data-sortable-check="" aria-hidden="true">
                          <Icon name="check" />
                        </span>
                      )}
                      {numbered && (
                        <span className="sortable-list-position" aria-hidden="true">
                          {position + 1}
                        </span>
                      )}
                      <span className="sortable-list-text">
                        <span className="sortable-list-label">{item.label}</span>
                        {/* A space between them, for text read as one line, like the agent's item names. */}
                        {item.description && " "}
                        {item.description && (
                          <span id={descriptionId} className="sortable-list-description">
                            {item.description}
                          </span>
                        )}
                      </span>
                    </>
                  )
                }
              </parts.Item>
            )
          })}
        </>
      )}
    </parts.Root>
  )
}

const SortableListRoot = parts.Root
const SortableListItemPart = parts.Item

export { SortableList, SortableListItemPart, SortableListRoot }
export type { SortableListItem, SortableListItemState, SortableListProps }
