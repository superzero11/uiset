import type { JSX } from "@solidjs/web"
import { createParts, type PartProps } from "@ui-sdk/solid/primitive"
import { createUniqueId, For, omit, onSettled, Show } from "solid-js"
import { keepDragPreviewInside } from "../../registry/uiset/ui/shell/drag-preview"
import { glide } from "../../registry/uiset/ui/shell/glide"
import { Icon } from "./shell/icons"
import { sortableTree, type SortableTreeItem, type SortableTreeOptions, type SortableTreeRow } from "../../registry/uiset/ui/sortable-tree/sortable-tree"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/sortable-tree/sortable-tree.css"

const parts = createParts(sortableTree, { root: "div", row: "div" })

type SortableTreeRowState = SortableTreeRow & { moving: boolean; dragging: boolean; invalid: boolean }
type RowMotion = { moving: boolean; dragging: boolean; invalid: boolean }

type SortableTreeProps = SortableTreeOptions &
  Omit<PartProps<"div">, "defaultValue" | "onChange" | "children" | "aria-label"> & {
    /** What the tree holds, like "Files" or "Outline". It names the tree for people and agents. */
    label: string
    /** Folder and file icons beside the names. */
    icons?: boolean
    /** A row's face after its disclosure arrow, in place of the icon and name. */
    renderItem?: (item: SortableTreeItem, row: SortableTreeRowState) => JSX.Element
    /** How to move rows, read out once with the tree. Defaults to English. */
    help?: string
  }

const helpText =
  "Arrow keys move between rows; Right opens a branch and Left closes it. Space picks a row up with what's under it, Up and Down move it, Left and Right change its level, Space drops it and Escape puts it back."

/**
 * A tree people put in order and nest: drag a row up or down, and sideways to change its
 * level, or press Space on it, move it with the arrows and press Space again.
 */
function SortableTree(props: SortableTreeProps) {
  const helpId = `${createUniqueId()}-help`
  // A dragged row's copy stays inside the tree, and rows slide to their new places.
  let root: HTMLDivElement | undefined
  onSettled(() => {
    if (!root) return
    const stopPreview = keepDragPreviewInside(root)
    const stopGlide = glide(root, ".sortable-tree-row")
    return () => {
      stopPreview()
      stopGlide()
    }
  })
  const described = () => [props["aria-describedby"], helpId].filter(Boolean).join(" ")
  const rest = omit(props, "label", "icons", "renderItem", "help", "class", "aria-describedby")

  return (
    <parts.Root
      {...rest}
      ref={(el: HTMLDivElement) => {
        root = el
      }}
      aria-label={props.label}
      aria-describedby={described()}
      class={["sortable-tree", props.class as string | undefined]}
    >
      {(state: { rows: SortableTreeRow[]; nodes: Map<string, SortableTreeItem> }) => (
        <>
          <p id={helpId} hidden>
            {props.help ?? helpText}
          </p>
          <For each={state.rows} keyed={(row) => row.key}>
            {(row) => (
              <Show when={state.nodes.get(row().key)}>
                {(item) => (
                  <parts.Row value={row().key} class="sortable-tree-row" aria-label={item().label} style={{ "--sortable-tree-depth": String(row().depth) }}>
                    {(motion: RowMotion) => (
                      <>
                        <span class="sortable-tree-toggle" data-sortable-tree-toggle="" aria-hidden="true">
                          <Show when={row().branch}>
                            <Icon name="chevron" />
                          </Show>
                        </span>
                        {props.renderItem ? (
                          props.renderItem(item(), { ...row(), moving: motion.moving, dragging: motion.dragging, invalid: motion.invalid })
                        ) : (
                          <>
                            <Show when={props.icons}>
                              <Icon name={row().branch ? "folder" : "file"} class="sortable-tree-icon" />
                            </Show>
                            <span class="sortable-tree-name">{item().label}</span>
                            <Show when={item().locked}>
                              <Icon name="lock" class="sortable-tree-lock" />
                            </Show>
                          </>
                        )}
                        {/* Where it can't be dropped, a mark in place of the grip: the reason isn't only a color. */}
                        <span class="sortable-tree-refuse" aria-hidden="true">
                          <Icon name="close" />
                        </span>
                        <span class="sortable-tree-handle" data-sortable-handle="" aria-hidden="true">
                          <Icon name="grip" />
                        </span>
                      </>
                    )}
                  </parts.Row>
                )}
              </Show>
            )}
          </For>
        </>
      )}
    </parts.Root>
  )
}

const SortableTreeRoot = parts.Root
const SortableTreeRowPart = parts.Row

export { SortableTree, SortableTreeRoot, SortableTreeRowPart }
export type { SortableTreeItem, SortableTreeProps, SortableTreeRowState }
