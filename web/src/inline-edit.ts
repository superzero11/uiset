// The inline edit for Web Components, on the same primitive as React's `InlineEdit` (UI
// SDK's createInlineEdit): <uiset-inline-edit label="Project name" value="Atlas"> shows the
// value as a button, and pressing it, Enter or F2 turns it into a field. Enter or leaving
// saves, Escape cancels, and `validate` keeps text that can't be saved in the field.
import type { InlineEditReason } from "@ui-sdk/core"
import { createParts, wrappedButton, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import { inlineEdit } from "@/registry/uiset/ui/inline-edit/inline-edit"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/inline-edit/inline-edit.css"
import { attr, h, holdRender, isOn, reportPartInput, uid } from "./dom"

/** What `<uiset-inline-edit>` fires: `valuechange` when an edit is saved; `preventDefault()` refuses it. */
type UISetInlineEditEvents = { valuechange: UiChangeEvent<string, InlineEditReason> }

type InlineEditElement = UiElement<UISetInlineEditEvents> & {
  /** The saved text. Setting it fires nothing. */
  value: string
  /** Returns what's wrong with the text, or nothing when it can be saved. */
  validate?: (text: string) => string | null | undefined
  disabled: boolean
  /** Edit, save or cancel from code. `setValue` saves text as if typed, `validate` included. */
  api?: { startEditing(): void; setValue(text: string): boolean; save(): void; cancel(): void }
}

type InlineEditInstance = {
  get: () => { value: string; editing: string | null; error: string | null; disabled: boolean }
  subscribe: (run: () => void) => () => void
}

const errorIds = new WeakMap<Element, string>()
const errorIdOf = (el: Element) => errorIds.get(el) ?? (errorIds.set(el, uid("inline-edit-error")), errorIds.get(el)!)

/** The value as a button, or the field (with Save and Cancel, and the problem) while editing. */
function draw(el: HTMLElement, instance: InlineEditInstance) {
  let mode: "preview" | "edit" | null = null
  let preview: { button: HTMLElement; text: HTMLElement } | null = null
  let error: HTMLElement | null = null
  const render = () => {
    const state = instance.get()
    const label = el.getAttribute("label") ?? "Value"
    el.classList.add("inline-edit")
    attr(el, "aria-label", label)
    if (state.editing === null) {
      if (mode !== "preview") {
        const text = h("span", { class: "inline-edit-value" })
        const button = h("button", { type: "button" }, text, iconElement("edit"))
        el.replaceChildren(h("uiset-inline-edit-preview", null, button))
        preview = { button, text }
        error = null
        mode = "preview"
      }
      const shown = state.value || (el.getAttribute("placeholder") ?? "Empty")
      if (preview!.text.textContent !== shown) preview!.text.textContent = shown
      // The name holds the text people see, so someone who speaks it still finds it.
      attr(preview!.button, "aria-label", `${el.getAttribute("edit-label") ?? `Edit ${label}`}: ${shown}`)
      return
    }
    if (mode !== "edit") {
      const parts: HTMLElement[] = [h("uiset-inline-edit-input", null, h("input", { "aria-label": label, autocomplete: "off" }))]
      if (isOn(el, "actions")) {
        parts.push(
          h("uiset-inline-edit-save", null, h("button", { type: "button", "aria-label": el.getAttribute("save-label") ?? `Save ${label}` }, iconElement("check"))),
          h("uiset-inline-edit-cancel", null, h("button", { type: "button", "aria-label": el.getAttribute("cancel-label") ?? "Cancel" }, iconElement("close"))),
        )
      }
      el.replaceChildren(...parts)
      preview = null
      mode = "edit"
    }
    if (state.error) {
      error ??= h("uiset-inline-edit-error", { id: errorIdOf(el) })
      if (error.textContent !== state.error) error.textContent = state.error
      if (error.parentNode !== el) el.append(error)
    } else error?.remove()
  }
  render()
  const stop = instance.subscribe(render)
  const watch = new MutationObserver(render)
  watch.observe(el, { attributeFilter: ["label", "placeholder", "edit-label", "save-label", "cancel-label"] })
  return () => {
    stop()
    watch.disconnect()
  }
}

function defineInlineEdit() {
  createParts(inlineEdit, {
    root: {
      tag: "uiset-inline-edit",
      // A function to call, not an event to fire.
      kinds: { validate: "value", errorId: null },
      properties: ["validate"],
      options: (el) => ({ errorId: errorIdOf(el) }),
      api: ["startEditing", "setValue", "save", "cancel"],
      render: holdRender((el, instance) => {
        // Its `value` stays live, as a text field's does; v-model hears `input` and `change`.
        reportPartInput(el, "valuechange", "valuechange", { follow: true })
        return draw(el, instance as unknown as InlineEditInstance)
      }),
    },
    preview: { tag: "uiset-inline-edit-preview", target: wrappedButton, display: "contents" },
    input: { tag: "uiset-inline-edit-input", target: (el) => el.querySelector("input"), display: "contents" },
    save: { tag: "uiset-inline-edit-save", target: wrappedButton, display: "contents" },
    cancel: { tag: "uiset-inline-edit-cancel", target: wrappedButton, display: "contents" },
    error: "uiset-inline-edit-error",
  })
}

export { defineInlineEdit }
export type { InlineEditElement, UISetInlineEditEvents }
