import { keepFocus } from "@ui-sdk/core"

/**
 * UI SDK's `keepFocus`, for focus that goes back somewhere after a person clicks.
 *
 * `keepFocus` moves focus to the new element unless the person has put focus somewhere else
 * in the meantime. Safari doesn't focus a button when it's clicked: focus goes to the nearest
 * focusable ancestor instead, often a `<main tabindex="-1">` that an app focuses after
 * navigating. `keepFocus` reads that as focus the person moved, and leaves it there. Here,
 * focus resting on an ancestor of the element counts as lost too.
 */
function returnFocus(element: () => HTMLElement | undefined) {
  keepFocus(element)
  const restore = () => {
    const el = element()
    const active = el?.ownerDocument.activeElement
    if (el && active && active !== el && active.contains(el)) el.focus()
  }
  queueMicrotask(restore)
  setTimeout(restore)
}

export { returnFocus }
