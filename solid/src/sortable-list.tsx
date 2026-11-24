import type { JSX } from "@solidjs/web"
import { createParts, type PartProps } from "@ui-sdk/solid/primitive"
import { createMemo, createUniqueId, For, omit, onSettled, Show } from "solid-js"
import { keepDragPreviewInside } from "../../registry/uiset/ui/shell/drag-preview"
import { glide } from "../../registry/uiset/ui/shell/glide"
import { Icon } from "./shell/icons"
import { sortableList, type SortableListOptions } from "../../registry/uiset/ui/sortable-list/sortable-list"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/sortable-list/sortable-list.css"

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
    renderItem?: (item: SortableListItem, state: SortableListItemState) => JSX.Element
    /** How to move items, read out once with the list. Defaults to English. */
    help?: string
  }

const helpText = (multiple: boolean) =>
  "Space picks an item up, the arrow keys move it, Space drops it and Escape puts it back." +
  (multiple ? " Shift+Space selects items to move together, and Shift with the arrow keys selects a run." : "")

/** An item's label and description, with its grip, check and place. */
function SortableListFace(props: { item: SortableListItem; multiple: boolean; numbered: boolean; position: number; descriptionId?: string }) {
  return (
    <>
      <span class="sortable-list-handle" data-sortable-handle="" aria-hidden="true">
        <Icon name={props.item.locked ? "lock" : "grip"} />
      </span>
      <Show when={props.multiple && !props.item.locked}>
        <span class="sortable-list-check" data-sortable-check="" aria-hidden="true">
          <Icon name="check" />
        </span>
      </Show>
      <Show when={props.numbered}>
        <span class="sortable-list-position" aria-hidden="true">
          {props.position}
        </span>
      </Show>
      <span class="sortable-list-text">
        <span class="sortable-list-label">{props.item.label}</span>
        {/* A space between them, for text read as one line, like the agent's item names. */}
        <Show when={props.item.description}>
          {(description) => (
            <>
              {" "}
              <span id={props.descriptionId} class="sortable-list-description">
                {description()}
              </span>
            </>
          )}
        </Show>
      </span>
    </>
  )
}

/**
 * A list people put in order: drag an item by its grip, or focus it, press Space, move it
 * with the arrows and press Space again. With `multiple`, a selection moves together.
 */
function SortableList(props: SortableListProps) {
  const baseId = createUniqueId()
  const helpId = `${baseId}-help`
  const multiple = () => props.multiple ?? false
  const byKey = createMemo(() => new Map(props.items.map((item, index) => [item.value, { item, index }])))
  const keys = createMemo(() => props.items.map((item) => item.value))
  const itemLabel = (key: string) => byKey().get(key)?.item.label ?? key
  const locked = (key: string) => !!byKey().get(key)?.item.locked
  // A dragged item's copy stays inside the list, and items slide to their new places.
  let root: HTMLDivElement | undefined
  onSettled(() => {
    if (!root) return
    const stopPreview = keepDragPreviewInside(root)
    const stopGlide = glide(root, ".sortable-list-item")
    return () => {
      stopPreview()
      stopGlide()
    }
  })
  const described = () => [props["aria-describedby"], helpId].filter(Boolean).join(" ")
  const rest = omit(props, "label", "items", "numbered", "renderItem", "help", "multiple", "class", "aria-describedby")

  return (
    <parts.Root
      {...rest}
      ref={(el: HTMLDivElement) => {
        root = el
      }}
      keys={keys()}
      multiple={multiple()}
      itemLabel={itemLabel}
      locked={locked}
      aria-label={props.label}
      aria-describedby={described()}
      class={["sortable-list", props.numbered && "sortable-list-numbered", props.class as string | undefined]}
    >
      {(state: { order: string[] }) => (
        <>
          <p id={helpId} hidden>
            {props.help ?? helpText(multiple())}
          </p>
          <For each={state.order}>
            {(key, position) => (
              <Show when={byKey().get(key)}>
                {(entry) => {
                  const descriptionId = () => (entry().item.description ? `${baseId}-${entry().index}` : undefined)
                  return (
                    <parts.Item value={key} class="sortable-list-item" aria-label={entry().item.label} aria-describedby={descriptionId()}>
                      {(itemState: SortableListItemState) =>
                        props.renderItem ? (
                          props.renderItem(entry().item, itemState)
                        ) : (
                          <SortableListFace item={entry().item} multiple={multiple()} numbered={!!props.numbered} position={position() + 1} descriptionId={descriptionId()} />
                        )
                      }
                    </parts.Item>
                  )
                }}
              </Show>
            )}
          </For>
        </>
      )}
    </parts.Root>
  )
}

const SortableListRoot = parts.Root
const SortableListItemPart = parts.Item

export { SortableList, SortableListItemPart, SortableListRoot }
export type { SortableListItem, SortableListItemState, SortableListProps }
