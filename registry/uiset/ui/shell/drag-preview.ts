/**
 * UI SDK draws a dragged item's copy at the end of <body>, outside the skin's variables and
 * the component's styles, so it lost its look. While a drag that started inside `root` is
 * under way, its copy moves into `root` (it stays position: fixed). Returns a cleanup.
 */
function keepDragPreviewInside(root: HTMLElement) {
  const doc = root.ownerDocument
  let armed = false
  const arm = () => (armed = true)
  const disarm = () => (armed = false)
  const observer = new MutationObserver((records) => {
    if (!armed) return
    for (const record of records)
      for (const node of record.addedNodes)
        if (node instanceof HTMLElement && node.hasAttribute("data-drag-preview") && node.parentElement === doc.body) root.append(node)
  })
  observer.observe(doc.body, { childList: true })
  root.addEventListener("pointerdown", arm)
  doc.addEventListener("pointerup", disarm)
  doc.addEventListener("pointercancel", disarm)
  return () => {
    observer.disconnect()
    root.removeEventListener("pointerdown", arm)
    doc.removeEventListener("pointerup", disarm)
    doc.removeEventListener("pointercancel", disarm)
  }
}

export { keepDragPreviewInside }
