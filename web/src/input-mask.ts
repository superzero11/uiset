// The masked field for Web Components, on the same primitive and masks as React's
// `MaskedInput`: <uiset-masked-input label="Card number" mask="card-number"> formats as it's
// typed with the caret kept, names the card's brand (or the IBAN's country, or the currency's
// symbol) beside it, and checks itself when it's left. `mask` is card-number, card-expiry,
// card-code, iban, currency (with `currency` and `locale`) or pattern (with `pattern`).
import { announce } from "@ui-sdk/core"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import { createParts, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import { maskedInput, type MaskedInputReason } from "@/registry/uiset/ui/input-mask/input-mask"
import { maskMessages, maskNamed, type Mask, type MaskMessages } from "@/registry/uiset/ui/input-mask/masks"
import { formatEdit } from "@/registry/uiset/ui/shell/format-as-you-type"
import "@/registry/uiset/ui/input-mask/input-mask.css"
import { attr, h, holdRender, isOn, reportPartInput } from "./dom"

/** What `<uiset-masked-input>` fires: `valuechange` with what it reports; `preventDefault()` refuses it. */
type UISetMaskedInputEvents = { valuechange: UiChangeEvent<string, MaskedInputReason> }

type MaskedInputElement = UiElement<UISetMaskedInputEvents> & {
  /** What the field reports, as text: digits, "04/27", an IBAN, or an amount like "1234.5". */
  value: string
  /** What's wrong beyond the mask's own checks, or nothing. */
  validate?: (value: string) => string | null | undefined
  /** The words it says, for other languages. */
  messages?: Partial<MaskMessages>
  disabled: boolean
  /** Set it from code in any format, through the mask's checks: a refusal throws with the reason. */
  api?: { setValue(text: string): boolean }
}

type MaskedInputInstance = {
  get: () => { value: string; disabled: boolean }
  subscribe: (run: () => void) => () => void
}

type MaskApi = { set: (value: string, details: { reason: MaskedInputReason }) => boolean }

const requests = new WeakMap<Element, (text: string) => string | null>()
const asText = (value: unknown) => (value === null || value === undefined ? "" : String(value))

function maskOf(el: HTMLElement): Mask | null {
  return maskNamed(el.getAttribute("mask") ?? "", {
    currency: el.getAttribute("currency") ?? undefined,
    locale: el.getAttribute("locale") ?? undefined,
    pattern: el.getAttribute("pattern") ?? undefined,
  })
}

function draw(el: MaskedInputElement, instance: MaskedInputInstance) {
  const api = () => (el as unknown as { api: MaskApi }).api
  const words = () => ({ ...maskMessages, ...el.messages })
  let mask = maskOf(el)
  let kept = mask ? mask.fromValue(instance.get().value) : instance.get().value
  // The value last seen; every mask reads its own value back as it was typed.
  let seen = instance.get().value
  let error: string | null = null

  const label = h("ui-field-label")
  const input = h("input", { type: "text", dir: "ltr", spellcheck: "false", class: "masked-input-text" }) as HTMLInputElement
  const before = h("span", { class: "masked-input-addon", "aria-live": "polite", "data-side": "start" })
  const after = h("span", { class: "masked-input-addon", "aria-live": "polite", "data-side": "end" })
  const box = h("div", { class: "masked-input-field", "data-field-box": "" }, before, h("ui-input", null, input), after)
  const description = h("ui-field-description")
  const problem = h("ui-field-error", { match: "true" })
  // The field is the person's; an agent has the element's own setValue (input-mask.ts).
  const field = h("ui-field", { class: "masked-input-body", "data-agent-hidden": "" }, label, box, description)
  const submitted = h("input", { type: "hidden" }) as HTMLInputElement
  el.replaceChildren(field, submitted)

  const refuse = (reason: string | null) => {
    error = reason
    paint()
    if (reason) announce(reason)
  }
  const check = (at = kept) => (mask ? (mask.check(at, words()) ?? (at ? (el.validate?.(asText(mask.value(at))) ?? null) : null)) : null)
  const commit = (next: string, reason: MaskedInputReason) => {
    kept = next
    const value = asText(mask ? mask.value(next) : next)
    if (value !== instance.get().value) api().set(value, { reason })
    paint()
  }

  requests.set(el, (text) => {
    if (!mask) return "It has no mask to read text with."
    const read = mask.read ? mask.read(text) : mask.keep(text)
    const problem = check(read)
    if (problem) return problem
    commit(read, "set")
    refuse(null)
    return null
  })

  input.addEventListener("input", (event) => {
    if (!mask) return
    const inputType = (event as InputEvent).inputType
    if (inputType === "insertFromPaste" && mask.read) {
      commit(mask.read(input.value), "paste")
      input.setSelectionRange(input.value.length, input.value.length)
    } else {
      const edit = formatEdit({ text: input.value, caret: input.selectionStart ?? input.value.length, inputType, before: kept }, mask)
      commit(edit.kept, inputType === "insertFromPaste" ? "paste" : "type")
      input.setSelectionRange(edit.caret, edit.caret)
    }
    if (error) refuse(null)
  })
  input.addEventListener("blur", () => refuse(check()))

  let maskFor = ""
  function paint() {
    const state = instance.get()
    const key = ["mask", "currency", "locale", "pattern"].map((name) => el.getAttribute(name)).join("|")
    if (key !== maskFor) {
      maskFor = key
      mask = maskOf(el)
      kept = mask ? mask.fromValue(state.value) : state.value
    }
    // A new value is shown again. One this field reported reads back as it was typed.
    if (state.value !== seen) {
      seen = state.value
      kept = mask ? mask.fromValue(state.value) : state.value
    }
    const name = el.getAttribute("label") ?? "Value"
    el.classList.add("masked-input")
    attr(el, "aria-label", name)
    attr(el, "data-mask", mask?.kind ?? null)
    attr(el, "data-agent-secret", mask?.secret ? "" : null)
    label.textContent = name
    const text = mask ? mask.format(kept) : kept
    if (input.value !== text) input.value = text
    attr(input, "inputmode", mask?.inputMode ?? null)
    attr(input, "autocomplete", mask?.autoComplete ?? null)
    attr(input, "autocapitalize", mask?.kind === "iban" ? "characters" : null)
    attr(input, "placeholder", el.getAttribute("placeholder") ?? mask?.placeholder ?? null)
    attr(input, "required", isOn(el, "required") ? "" : null)
    attr(input, "readonly", isOn(el, "readonly") ? "" : null)
    attr(input, "disabled", state.disabled ? "" : null)
    const addon = mask?.addon?.(kept) ?? null
    const side = mask?.addonAt ?? "end"
    before.textContent = side === "start" ? (addon ?? "") : ""
    after.textContent = side === "end" ? (addon ?? "") : ""
    before.hidden = !before.textContent
    after.hidden = !after.textContent
    input.setCustomValidity(error ?? "")
    const shownError = error ?? el.getAttribute("error")
    ;(field as HTMLElement & { invalid?: boolean }).invalid = shownError ? true : undefined
    // In only while there's a problem, its text set first: an empty <ui-field-error> on the
    // page fills itself with the browser's own message, which here is none.
    if (shownError) {
      if (problem.textContent !== shownError) problem.textContent = shownError
      if (!problem.isConnected) field.append(problem)
    } else problem.remove()
    const about = el.getAttribute("description")
    description.textContent = about ?? ""
    description.hidden = !about
    attr(submitted, "name", el.getAttribute("name"))
    attr(submitted, "form", el.getAttribute("form"))
    submitted.value = state.value
  }

  paint()
  const stop = instance.subscribe(paint)
  const watch = new MutationObserver(paint)
  watch.observe(el, { attributeFilter: ["label", "mask", "currency", "locale", "pattern", "placeholder", "description", "name", "form", "required", "readonly", "error"] })
  return () => {
    stop()
    watch.disconnect()
    requests.delete(el)
  }
}

function defineMaskedInput() {
  createParts(maskedInput, {
    root: {
      tag: "uiset-masked-input",
      // A function to call, not an event to fire.
      kinds: { request: null },
      options: (el) => ({
        request: (text: string) => {
          const asked = requests.get(el)
          return asked ? asked(text) : "It isn't ready yet."
        },
      }),
      api: ["setValue", "set"],
      render: holdRender((el, instance) => {
        // Its `value` stays live, as a text field's does; v-model hears `input` and `change`.
        reportPartInput(el, "valuechange", "valuechange", { follow: true })
        return draw(el as MaskedInputElement, instance as unknown as MaskedInputInstance)
      }),
    },
  })
}

export { defineMaskedInput }
export type { MaskedInputElement, UISetMaskedInputEvents }
