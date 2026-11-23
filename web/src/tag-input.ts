// The tag input for Web Components, on the same primitive and rules as React's `TagInput`:
// <uiset-tag-input label="Topics" value="React, CSS"> draws UI SDK's combobox with chips in a
// field. A comma (each character of `delimiters`) or Enter adds what's typed, a pasted list
// becomes one tag each, leaving adds it, and Enter, F2 or a double-click edits a tag in place.
import { announce } from "@ui-sdk/core"
import "@ui-sdk/web/combobox"
import "@ui-sdk/web/field"
import { createParts, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import { tagInput, type TagInputReason } from "@/registry/uiset/ui/tag-input/tag-input"
import {
  addTags,
  defaultDelimiters,
  replaceTags,
  splitTags,
  tagMessages,
  takeEnded,
  type TagMessages,
  type TagRules,
} from "@/registry/uiset/ui/tag-input/tags"
import "@/registry/uiset/ui/tag-input/tag-input.css"
import { attr, h, holdRender, isOn, reportPartInput } from "./dom"

/** What `<uiset-tag-input>` fires: `valuechange` with the tags; `preventDefault()` refuses it. */
type UISetTagInputEvents = { valuechange: UiChangeEvent<string[], TagInputReason> }

type TagInputElement = UiElement<UISetTagInputEvents> & {
  /** The tags. Setting it fires nothing. */
  value: string[]
  /** Tags to pick from, filtered as you type. Without them there's no list. */
  suggestions?: readonly string[]
  /** What's wrong with a tag, or nothing when it can be added. */
  validate?: TagRules["validate"]
  /** Changes a tag before it's checked, like `(tag) => tag.toLowerCase()`. */
  transform?: TagRules["transform"]
  /** The words it says, for other languages. */
  messages?: Partial<TagMessages>
  disabled: boolean
  /** Change the tags from code, through the same rules: a refusal throws with the reason. */
  api?: { setValue(tags: string[]): boolean; add(...tags: string[]): boolean; remove(...tags: string[]): boolean }
}

type TagInputInstance = {
  get: () => { value: string[]; disabled: boolean }
  subscribe: (run: () => void) => () => void
}

type Live = HTMLElement & { value: unknown; query: string }

type TagApi = { set: (tags: string[], details: { reason: TagInputReason; event?: Event }) => boolean }

const requests = new WeakMap<Element, (tags: string[]) => string | null>()

const number = (el: Element, name: string) => {
  const value = el.getAttribute(name)
  return value === null || value === "" || Number.isNaN(Number(value)) ? undefined : Number(value)
}

/** The rules from the element's attributes and properties, read fresh for each change. */
function rulesOf(el: TagInputElement): TagRules {
  const unique = el.getAttribute("unique")
  return {
    // Each character is one: delimiters=",; " is comma, semicolon and space.
    delimiters: el.hasAttribute("delimiters") ? [...(el.getAttribute("delimiters") ?? "")] : defaultDelimiters,
    unique: unique === "true" ? true : unique === "false" ? false : "ignore-case",
    max: number(el, "max"),
    maxLength: number(el, "max-length"),
    validate: el.validate,
    transform: el.transform,
  }
}

function draw(el: TagInputElement, instance: TagInputInstance) {
  const api = () => (el as unknown as { api: TagApi }).api
  const messages = () => ({ ...tagMessages, ...el.messages })
  const tags = () => instance.get().value
  let editing: number | null = null
  let error: string | null = null

  const input = h("input", { class: "tag-input-input", autocomplete: "off" }) as HTMLInputElement
  const chips = h("ui-combobox-chips", { class: "tag-input-field" }, h("ui-combobox-input", null, input))
  const template = document.createElement("template")
  template.content.append(
    h("ui-combobox-chip", { class: "tag-input-tag" }, h("ui-combobox-chip-remove", null, h("button", { type: "button" }, iconElement("close")))),
  )
  const empty = h("ui-combobox-empty")
  const list = h("ui-combobox-list")
  const content = h("ui-combobox-content", { hidden: "" }, empty, list)
  const combobox = h("ui-combobox", { multiple: "", "allow-custom-value": "", "keep-query": "" }, chips, content, template) as Live
  const label = h("ui-field-label")
  const description = h("ui-field-description", { class: "tag-input-description" })
  const problem = h("ui-field-error", { match: "true" })
  // The field is the person's; an agent has the tag input's own actions (tag-input.ts).
  const field = h("ui-field", { class: "tag-input-body", "data-agent-hidden": "" }, label, combobox, description)
  el.replaceChildren(field)

  const delimiters = () => rulesOf(el).delimiters ?? defaultDelimiters
  const joiner = () => `${delimiters()[0] ?? ","} `
  const setQuery = (text: string) => {
    if (combobox.query !== text) combobox.query = text
    if (input.value !== text) input.value = text
  }
  const refuse = (reason: string | null) => {
    error = reason
    paint()
    if (reason) announce(reason)
  }
  // No event goes with a change: its reason says what happened, and UI SDK checks events
  // against the reasons it knows.
  const commit = (next: string[], reason: TagInputReason) => {
    if (next.length === tags().length && next.every((tag, index) => tag === tags()[index])) return true
    return api().set(next, { reason })
  }

  /** Adds texts (or, while editing, puts the first in the edited tag's place); what's refused stays typed. */
  const add = (texts: string[], reason: TagInputReason, rest = "") => {
    const at = editing ?? undefined
    const change = addTags(tags(), texts, rulesOf(el), messages(), at)
    commit(change.tags, at === undefined ? reason : "edit")
    if (at !== undefined && !change.error) editing = null
    setQuery([change.refused, rest].filter(Boolean).join(joiner()))
    refuse(change.error)
  }

  const startEdit = (index: number) => {
    if (instance.get().disabled || isOn(el, "readonly")) return
    editing = index
    setQuery(tags()[index] ?? "")
    refuse(null)
    // The field already holds the tag's text: focus it now, selected to retype.
    input.focus()
    input.select()
  }
  const cancelEdit = () => {
    editing = null
    setQuery("")
    refuse(null)
  }
  const finishEdit = () => {
    if (editing === null) return
    if (!input.value.trim()) {
      const at = editing
      editing = null
      commit(
        tags().filter((_, index) => index !== at),
        "remove",
      )
      setQuery("")
      refuse(null)
      return
    }
    add([input.value], "edit")
  }

  requests.set(el, (next) => {
    const change = replaceTags(tags(), next, rulesOf(el), messages())
    if (change.error) return change.error
    commit(change.tags, "set")
    refuse(null)
    return null
  })

  const shown = () => {
    const now = tags()
    return el.suggestions?.filter((suggestion) => !now.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()))
  }
  const canOpen = () => {
    const left = shown()
    return !!left && (left.length > 0 || !!input.value.trim())
  }

  combobox.addEventListener("valuechange", ((event: UiChangeEvent<string[]>) => {
    event.preventDefault()
    const next = event.detail.value ?? []
    const reason = event.detail.reason
    if (reason === "remove-press" || reason === "clear-press") {
      if (editing !== null) cancelEdit()
      commit(next, "remove")
      refuse(null)
    } else if (reason === "input-change" || reason === "item-press") {
      const picked = next.filter((tag) => !tags().includes(tag))
      add(picked.length ? picked : [input.value], "add")
    } else {
      const change = replaceTags(tags(), next, rulesOf(el), messages())
      if (!change.error) commit(change.tags, "set")
      refuse(change.error)
    }
  }) as EventListener)

  combobox.addEventListener("querychange", ((event: UiChangeEvent<string>) => {
    if (isOn(el, "readonly")) return event.preventDefault()
    const { ended, rest } = takeEnded(event.detail.value, delimiters())
    if (!ended.length) return
    event.preventDefault()
    add(ended, "add", rest)
  }) as EventListener)

  combobox.addEventListener("openchange", ((event: UiChangeEvent<boolean>) => {
    if (event.detail.value && !canOpen()) event.preventDefault()
  }) as EventListener)

  input.addEventListener("keydown", (event) => {
    if (editing === null) return
    if (event.key === "Backspace" && !input.value) {
      // UI SDK removes the last tag here; while one is being edited, that's not what was meant.
      event.preventDefault()
      event.stopImmediatePropagation()
    } else if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault()
      event.stopImmediatePropagation()
      finishEdit()
    } else if (event.key === "Escape") {
      cancelEdit()
    }
  })

  input.addEventListener("paste", (event) => {
    // A single input drops line breaks from what's pasted, so split before it does.
    const pasted = event.clipboardData?.getData("text") ?? ""
    if (!/[\r\n]/.test(pasted) && !delimiters().some((delimiter) => delimiter && pasted.includes(delimiter))) return
    event.preventDefault()
    const before = input.value.slice(0, input.selectionStart ?? input.value.length)
    const after = input.value.slice(input.selectionEnd ?? input.value.length)
    add(splitTags(before + pasted + after, delimiters()), "paste")
  })

  input.addEventListener("focusout", (event) => {
    if (el.getAttribute("add-on-blur") === "false" || el.contains(event.relatedTarget as Node | null)) return
    if (editing !== null) finishEdit()
    else if (input.value.trim()) add([input.value], "add")
  })

  const chipAt = (target: EventTarget | null) => {
    const chip = (target as Element | null)?.closest?.("ui-combobox-chip")
    return chip ? [...chips.querySelectorAll("ui-combobox-chip")].indexOf(chip) : -1
  }
  chips.addEventListener("keydown", (event) => {
    if (event.target === input || (event.target as Element).closest("ui-combobox-chip-remove")) return
    if (event.key !== "Enter" && event.key !== "F2") return
    const index = chipAt(event.target)
    if (index < 0) return
    event.preventDefault()
    startEdit(index)
  })
  chips.addEventListener("dblclick", (event) => {
    const index = chipAt(event.target)
    if (index >= 0 && !(event.target as Element).closest("ui-combobox-chip-remove")) startEdit(index)
  })

  // The chips UI SDK draws, made the tag input's: the text in a span (for the ellipsis), the
  // remove button's name in the page's words, and the tag being edited marked.
  const dress = () => {
    const words = messages()
    chips.querySelectorAll("ui-combobox-chip").forEach((chip, index) => {
      const tag = chip.getAttribute("value") ?? ""
      const text = chip.firstChild
      if (text && text.nodeType === Node.TEXT_NODE) chip.replaceChild(h("span", { class: "tag-input-text" }, text.textContent ?? ""), text)
      attr(chip, "data-editing", editing === index ? "" : null)
      const remove = chip.querySelector("button")
      if (remove) attr(remove, "aria-label", words.remove(tag))
    })
  }
  const watchChips = new MutationObserver(dress)
  watchChips.observe(chips, { childList: true })

  let suggestionsDrawn: string | undefined
  function paint() {
    const state = instance.get()
    const rules = rulesOf(el)
    const words = messages()
    attr(el, "aria-label", el.getAttribute("label") ?? "Tags")
    el.classList.add("tag-input")
    attr(el, "data-editing", editing !== null ? "" : null)
    label.textContent = el.getAttribute("label") ?? "Tags"
    attr(input, "placeholder", state.value.length ? null : el.getAttribute("placeholder"))
    const value = combobox.value as string[] | undefined
    if (!value || value.length !== state.value.length || value.some((tag, index) => tag !== state.value[index])) combobox.value = [...state.value]
    for (const name of ["name", "form", "required"] as const) attr(combobox, name, el.getAttribute(name))
    attr(combobox, "disabled", state.disabled ? "" : null)
    attr(combobox, "readonly", isOn(el, "readonly") ? "" : null)
    if (rules.max !== undefined) attr(combobox, "max-selected", String(rules.max))
    attr(field, "disabled", state.disabled ? "" : null)
    // A tag the rules refused says why first; then a problem from outside, like a form's (`error`).
    const shownError = error ?? el.getAttribute("error")
    ;(field as HTMLElement & { invalid?: boolean }).invalid = shownError ? true : undefined
    // In only while there's a problem, its text set first: an empty <ui-field-error> on the
    // page fills itself with the browser's own message, which here is none.
    if (shownError) {
      if (problem.textContent !== shownError) problem.textContent = shownError
      if (!problem.isConnected) field.append(problem)
    } else problem.remove()
    const text = el.getAttribute("description")
    const count = rules.max !== undefined ? words.count(state.value.length, rules.max) : null
    description.replaceChildren(...[text, count && h("span", { class: "tag-input-count" }, count)].filter((part): part is string | HTMLElement => !!part))
    description.hidden = !text && !count
    const left = shown()
    // Redrawn only when the list changes: new items beside old ones read as duplicates.
    const key = left?.join("\u0000")
    if (key !== suggestionsDrawn) {
      suggestionsDrawn = key
      list.replaceChildren(...(left ?? []).map((suggestion) => h("ui-combobox-item", { value: suggestion, label: suggestion }, suggestion)))
    }
    empty.textContent = left && input.value.trim() ? `Enter adds “${input.value.trim()}”` : ""
    dress()
  }

  paint()
  const stop = instance.subscribe(paint)
  const watch = new MutationObserver(paint)
  watch.observe(el, { attributeFilter: ["label", "placeholder", "description", "max", "max-length", "delimiters", "unique", "name", "form", "required", "readonly", "add-on-blur", "error"] })
  return () => {
    stop()
    watch.disconnect()
    watchChips.disconnect()
    requests.delete(el)
  }
}

function defineTagInput() {
  createParts(tagInput, {
    root: {
      tag: "uiset-tag-input",
      // Functions to call, not events to fire.
      kinds: { request: null },
      properties: ["suggestions", "validate", "transform", "messages"],
      options: (el) => ({ request: (tags: string[]) => requests.get(el)?.(tags) ?? null }),
      api: ["setValue", "add", "remove", "set"],
      render: holdRender((el, instance) => {
        // Its `value` stays live, as a text field's does; v-model hears `input` and `change`.
        reportPartInput(el, "valuechange", "valuechange", { follow: true })
        return draw(el as TagInputElement, instance as unknown as TagInputInstance)
      }),
    },
  })
}

export { defineTagInput }
export type { TagInputElement, UISetTagInputEvents }
