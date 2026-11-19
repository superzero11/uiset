"use client"

import { createParts, type PartProps } from "@ui-sdk/react/primitive"
import { useCallback, useId, type CSSProperties, type ReactNode } from "react"
import { keepDragPreviewInside } from "./shell/drag-preview"
import { Icon } from "./shell/icons"
import { sortableTree, type SortableTreeItem, type SortableTreeOptions, type SortableTreeRow } from "./sortable-tree/sortable-tree"
import "./shell/shell.css"
import "./sortable-tree/sortable-tree.css"

const parts = createParts(sortableTree, { root: "div", row: "div" })

type SortableTreeRowState = SortableTreeRow & { moving: boolean; dragging: boolean; invalid: boolean }

type SortableTreeProps = SortableTreeOptions &
  Omit<PartProps<"div">, "defaultValue" | "onChange" | "children" | "aria-label"> & {
    /** What the tree holds, like "Files" or "Outline". It names the tree for people and agents. */
    label: string
    /** Folder and file icons beside the names. */
    icons?: boolean
    /** A row's face after its disclosure arrow, in place of the icon and name. */
    renderItem?: (item: SortableTreeItem, row: SortableTreeRowState) => ReactNode
    /** How to move rows, read out once with the tree. Defaults to English. */
    help?: string
  }

const helpText =
  "Arrow keys move between rows; Right opens a branch and Left closes it. Space picks a row up with what's under it, Up and Down move it, Left and Right change its level, Space drops it and Escape puts it back."

/**
 * A tree people put in order and nest: drag a row up or down, and sideways to change its
 * level, or press Space on it, move it with the arrows and press Space again.
 */
function SortableTree({ label, icons = false, renderItem, help, className, ...props }: SortableTreeProps) {
  const helpId = `${useId()}-help`
  const keepPreview = useCallback((el: HTMLElement | null) => (el ? keepDragPreviewInside(el) : undefined), [])
  const described = [props["aria-describedby"], helpId].filter(Boolean).join(" ")

  return (
    <parts.Root
      {...props}
      ref={keepPreview}
      aria-label={label}
      aria-describedby={described}
      className={["sortable-tree", className].filter(Boolean).join(" ")}
    >
      {({ rows, nodes }) => (
        <>
          <p id={helpId} hidden>
            {help ?? helpText}
          </p>
          {rows.map((row) => {
            const item = nodes.get(row.key)
            if (!item) return null
            return (
              <parts.Row
                key={row.key}
                value={row.key}
                className="sortable-tree-row"
                aria-label={item.label}
                style={{ "--sortable-tree-depth": row.depth } as CSSProperties}
              >
                {(state: { moving: boolean; dragging: boolean; invalid: boolean }) => (
                  <>
                    <span className="sortable-tree-toggle" data-sortable-tree-toggle="" aria-hidden="true">
                      {row.branch && <Icon name="chevron" />}
                    </span>
                    {renderItem ? (
                      renderItem(item, { ...row, ...state })
                    ) : (
                      <>
                        {icons && <Icon name={row.branch ? "folder" : "file"} className="sortable-tree-icon" />}
                        <span className="sortable-tree-name">{item.label}</span>
                        {item.locked && <Icon name="lock" className="sortable-tree-lock" />}
                      </>
                    )}
                    {/* Where it can't be dropped, a mark in place of the grip: the reason isn't only a color. */}
                    <span className="sortable-tree-refuse" aria-hidden="true">
                      <Icon name="close" />
                    </span>
                    <span className="sortable-tree-handle" data-sortable-handle="" aria-hidden="true">
                      <Icon name="grip" />
                    </span>
                  </>
                )}
              </parts.Row>
            )
          })}
        </>
      )}
    </parts.Root>
  )
}

const SortableTreeRoot = parts.Root
const SortableTreeRowPart = parts.Row

export { SortableTree, SortableTreeRoot, SortableTreeRowPart }
export type { SortableTreeItem, SortableTreeProps, SortableTreeRowState }
