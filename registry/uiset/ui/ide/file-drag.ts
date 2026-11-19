import { announce, bindDrag, bindDragPreview, createAutoScroll, dragThreshold } from "@ui-sdk/core"
import { keepDragPreviewInside } from "../shell/drag-preview"

// Dragging a file or folder into a folder in the IDE's file tree, for React's FileTree and
// <uiset-file-tree> alike. UI SDK's Tree keeps its keys, focus and selection; this adds a
// pointer drag from outside it (UI SDK's bindDrag, bindDragPreview and createAutoScroll;
// bindDrag also keeps the press that ends a drag from counting as a click that opens a file).
// Files sort by name, so a drop says which folder, not where in it: on a folder, into it; on
// a file, into the file's folder; on the tree's empty space, to the top. A folder the drag
// rests on opens. The keyboard's way is the same move, from Move to….

type FileDragOptions = {
  /** Whether rows can be dragged now. Defaults to yes. */
  enabled?: () => boolean
  /** Whether a path is a folder. */
  isFolder: (path: string) => boolean
  /** Moves `from` into `toFolder` ("" for the top). Returns a message when it can't. */
  move: (from: string, toFolder: string) => string | void | null | undefined
  /** Whether a folder is open, and opens one the drag rests on. */
  isExpanded: (folder: string) => boolean
  expand: (folder: string) => void
}

const dirName = (path: string) => path.split("/").slice(0, -1).join("/")
const baseName = (path: string) => path.split("/").pop() ?? path
/** How long a drag rests on a closed folder before it opens. */
const openDelay = 700

/**
 * Lets a row's label in `tree` be dragged onto a folder. `root` is the pane, where the drag's
 * copy is kept so it keeps the skin; `area` is the tree's scrolling area, whose empty space
 * means the top folder. Returns a cleanup.
 */
function bindFileDrag(root: HTMLElement, tree: HTMLElement, area: HTMLElement, options: () => FileDragOptions) {
  const doc = root.ownerDocument
  const keepPreview = keepDragPreviewInside(root)
  // Stops a drag under way, as when the tree goes.
  let stop: (() => void) | undefined

  const itemOf = (path: string) => [...tree.querySelectorAll<HTMLElement>("[data-path]")].find((el) => el.dataset.path === path)

  const down = (event: PointerEvent) => {
    // A finger scrolls the tree; Move to… moves on a touch screen.
    if (event.button !== 0 || event.pointerType === "touch" || options().enabled?.() === false) return
    const label = (event.target as Element).closest<HTMLElement>(".ide-tree-label")
    const path = label?.closest<HTMLElement>("[data-path]")?.dataset.path
    if (!label || !path || !tree.contains(label)) return
    const from = { x: event.clientX, y: event.clientY }
    let preview: ReturnType<typeof bindDragPreview> | undefined
    let scroll: ReturnType<typeof createAutoScroll> | undefined
    let target: string | null = null
    let marked: HTMLElement | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let last = from

    const mark = (folder: string | null) => {
      if (folder === target) return
      target = folder
      marked?.removeAttribute("data-drop-target")
      marked = folder === null ? undefined : folder === "" ? area : itemOf(folder)
      marked?.setAttribute("data-drop-target", "")
      preview?.el.toggleAttribute("data-over", folder !== null)
      clearTimeout(timer)
      const { isExpanded, expand } = options()
      if (folder && !isExpanded(folder)) timer = setTimeout(() => expand(folder), openDelay)
    }

    // Which folder the pointer is over, or null where a drop does nothing.
    const aim = (x: number, y: number) => {
      const { isFolder } = options()
      const over = doc.elementFromPoint(x, y)
      const row = over?.closest<HTMLElement>(".ide-tree-label")
      const at = row && tree.contains(row) ? row.closest<HTMLElement>("[data-path]")?.dataset.path : undefined
      const folder = at !== undefined ? (isFolder(at) ? at : dirName(at)) : over && area.contains(over) ? "" : null
      if (folder === null || folder === dirName(path)) return null
      if (isFolder(path) && (folder === path || folder.startsWith(`${path}/`))) return null
      return folder
    }

    const end = () => {
      clearTimeout(timer)
      mark(null)
      preview?.remove()
      scroll?.stop()
      itemOf(path)?.removeAttribute("data-drag-source")
      preview = undefined
      stop = undefined
    }

    stop?.()
    const untrack = bindDrag(label, event, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onStart: () => {
        preview = bindDragPreview(label, from)
        // The copy carries the row's own computed styles inline. It fits its name, wears the
        // pane's edge and surface, and sits below the pointer, so the folder it's over stays
        // readable.
        Object.assign(preview.el.style, {
          width: "max-content",
          maxWidth: "16rem",
          marginBlockStart: "1.375rem",
          marginInlineStart: "1rem",
          border: "1px solid var(--ui-border)",
          backgroundColor: "var(--ui-background)",
        })
        scroll = createAutoScroll({ edge: 32, speed: 14, ignore: () => preview?.el, onScroll: () => mark(aim(last.x, last.y)) })
        itemOf(path)?.setAttribute("data-drag-source", "")
      },
      onMove: ({ x, y }) => {
        last = { x, y }
        preview?.move(x, y)
        scroll?.update(x, y)
        mark(aim(x, y))
      },
      onEnd: (_event, canceled) => {
        const folder = target
        const dragged = !!preview
        end()
        if (!dragged || canceled || folder === null) return
        const refused = options().move(path, folder)
        announce(refused || `Moved ${baseName(path)} to ${folder || "the top folder"}.`)
      },
    })
    stop = () => {
      untrack()
      end()
    }
  }

  root.addEventListener("pointerdown", down)
  return () => {
    root.removeEventListener("pointerdown", down)
    stop?.()
    keepPreview()
  }
}

export { bindFileDrag }
export type { FileDragOptions }
