// The phone field for Web Components, on the same primitive and rules as React's
// `PhoneInput`: <uiset-phone-input label="Phone" default-country="GB"> draws UI SDK's
// combobox for the country and a field for the number, formatted as typed. The phone rules
// (and libphonenumber-js) load as a chunk of their own the first time one connects.
import { announce } from "@ui-sdk/core"
import "@ui-sdk/web/combobox"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import { createParts, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import { phoneInput, type PhoneInputReason } from "@/registry/uiset/ui/phone-input/phone-input"
import type { CountryCode, PhoneMessages } from "@/registry/uiset/ui/phone-input/phone"
import "@/registry/uiset/ui/phone-input/phone-input.css"
import { attr, h, holdRender, isOn, reportPartInput, uid } from "./dom"

/** What `<uiset-phone-input>` fires: `valuechange` with the number in E.164, and `countrychange`. */
type UISetPhoneInputEvents = {
  valuechange: UiChangeEvent<string, PhoneInputReason>
  countrychange: CustomEvent<{ value: string; reason: PhoneInputReason }>
}

type PhoneInputElement = UiElement<UISetPhoneInputEvents> & {
  /** The number in E.164, or "". Setting it fires nothing. */
  value: string
  /** The country, an ISO code like "GB". */
  country: string
  /** What's wrong with a number beyond its country's rules, or nothing. */
  validate?: (value: string) => string | null | undefined
  /** The words it says, for other languages. */
  messages?: Partial<PhoneMessages>
  countries?: readonly string[]
  preferredCountries?: readonly string[]
  disabled: boolean
  /** Set the number (any format) or the country from code, through the same rules: a refusal throws with the reason. */
  api?: { setValue(text: string, country?: string): boolean; setCountry(query: string): boolean }
}

type PhoneInputInstance = {
  get: () => { value: string; country: string; disabled: boolean }
  subscribe: (run: () => void) => () => void
}

type Rules = typeof import("@/registry/uiset/ui/phone-input/phone")
let loading: Promise<Rules> | undefined
const loadRules = () => (loading ??= import("@/registry/uiset/ui/phone-input/phone"))

type Live = HTMLElement & { value: unknown; query: string; itemToLabel?: (value: string) => string }
type PhoneApi = { set: (value: string, details: { reason: PhoneInputReason }) => boolean }

const requests = new WeakMap<Element, { value: (text: string, country?: string) => string | null; country: (query: string) => string | null }>()

function draw(el: PhoneInputElement, instance: PhoneInputInstance, rules: Rules) {
  const { checkPhone, countryList, countryOf, editPhone, findCountry, keepPhone, phoneMessages, readPhone, showPhone, startCountry, typePhone } = rules
  const api = () => (el as unknown as { api: PhoneApi }).api
  const words = () => ({ ...phoneMessages, ...el.messages })
  const locale = () => el.getAttribute("locale") ?? undefined
  let country = startCountry(el.getAttribute("country") ?? el.getAttribute("default-country") ?? undefined, locale())
  const first = showPhone(instance.get().value, country)
  country = first.country
  let kept = keepPhone(first.text)
  // The value last seen, and the one this field last reported: a controlled element still
  // holds the old one until the page takes the change, which isn't a value from outside.
  let seen = instance.get().value
  let reported = seen
  let error: string | null = null

  const label = h("ui-field-label")
  const flag = h("span", { class: "phone-input-flag", "aria-hidden": "true" })
  const dial = h("bdi", { class: "phone-input-dial", dir: "ltr" })
  const button = h("button", { type: "button", class: "phone-input-country" }, flag, dial, iconElement("down")) as HTMLButtonElement
  const search = h("input", { autofocus: "", class: "phone-input-search" }) as HTMLInputElement
  const empty = h("ui-combobox-empty")
  const list = h("ui-combobox-list")
  const boxId = uid("phone-input-field")
  const content = h("ui-combobox-content", { hidden: "", class: "phone-input-countries", anchor: `#${boxId}` }, h("ui-combobox-input", null, search), empty, list)
  const combobox = h("ui-combobox", null, h("ui-combobox-trigger", null, button), content) as Live
  combobox.itemToLabel = (code) => countryOf(code as CountryCode, locale()).name
  const number = h("input", { type: "tel", inputmode: "tel", autocomplete: "tel", dir: "ltr", class: "phone-input-number" }) as HTMLInputElement
  number.value = first.text
  // A field of its own, so the number's label and problem stay off the country search.
  const countryField = h("ui-field", { class: "phone-input-country-field" }, combobox)
  const box = h("div", { id: boxId, class: "phone-input-field", "data-field-box": "" }, countryField, h("ui-input", null, number))
  const description = h("ui-field-description")
  const problem = h("ui-field-error", { match: "true" })
  // The field is the person's; an agent has the phone input's own actions (phone-input.ts).
  const field = h("ui-field", { class: "phone-input-body", "data-agent-hidden": "" }, label, box, description)
  const submitted = h("input", { type: "hidden" }) as HTMLInputElement
  el.replaceChildren(field, submitted)

  const refuse = (reason: string | null) => {
    error = reason
    paint()
    if (reason) announce(reason)
  }
  const check = (value = instance.get().value, at = country) => checkPhone(value, at, words(), locale()) ?? (value ? (el.validate?.(value) ?? null) : null)

  const commit = (value: string, next: CountryCode, reason: PhoneInputReason) => {
    if (next !== country) {
      country = next
      ;(el as unknown as { country: string }).country = next
      el.dispatchEvent(new CustomEvent("countrychange", { detail: { value: next, reason }, bubbles: true }))
    }
    if (value !== reported) {
      reported = value
      api().set(value, { reason })
    }
    paint()
  }
  const show = (text: string) => {
    kept = keepPhone(text)
    if (number.value !== text) number.value = text
  }

  /** A new country for the digits already typed: a number typed with its own calling code drops it. */
  const chooseCountry = (code: CountryCode, reason: PhoneInputReason) => {
    const national = kept.startsWith("+") ? kept.replace(new RegExp(`^\\+${countryOf(country).dial.slice(1)}`), "") : kept
    const typed = typePhone(national, code)
    show(typed.text)
    commit(typed.value, code, reason)
    if (error) refuse(check(typed.value, code))
  }

  requests.set(el, {
    value: (text, at) => {
      const target = at ? findCountry(at, locale()) : country
      if (!target) return words().noCountry(at!)
      const read = readPhone(text, target, words(), locale())
      if ("error" in read) return read.error
      const own = read.value ? el.validate?.(read.value) : null
      if (own) return own
      show(showPhone(read.value, read.country).text)
      commit(read.value, read.country, "set")
      refuse(null)
      return null
    },
    country: (query) => {
      const code = findCountry(query, locale())
      if (!code || (el.countries && !el.countries.includes(code))) return words().noCountry(query)
      chooseCountry(code, "set")
      return null
    },
  })

  number.addEventListener("input", (event) => {
    const inputType = (event as InputEvent).inputType
    const edit = editPhone({ text: number.value, caret: number.selectionStart ?? number.value.length, inputType, before: kept }, country)
    show(edit.text)
    number.setSelectionRange(edit.caret, edit.caret)
    if (error) error = null
    commit(edit.value, edit.country, inputType === "insertFromPaste" ? "paste" : "type")
  })
  number.addEventListener("blur", () => refuse(check()))

  combobox.addEventListener("valuechange", ((event: UiChangeEvent<string | null>) => {
    if (event.detail.value) chooseCountry(event.detail.value as CountryCode, "country")
  }) as EventListener)
  combobox.addEventListener("openchange", ((event: UiChangeEvent<boolean>) => {
    if (event.detail.value) combobox.query = ""
  }) as EventListener)
  combobox.addEventListener("openchangecomplete", ((event: CustomEvent<{ value: boolean }>) => {
    if (!event.detail.value) button.focus()
  }) as EventListener)

  let listFor: string | undefined
  function paint() {
    const state = instance.get()
    // A value set from outside (not the one this field just reported) is shown again.
    if (state.value !== seen) {
      seen = state.value
      if (state.value !== reported) {
        reported = state.value
        const shown = showPhone(state.value, country)
        country = shown.country
        show(shown.text)
      }
    }
    if (state.country && state.country !== country) {
      country = startCountry(state.country)
      show(typePhone(keepPhone(number.value), country).text)
    }
    const text = words()
    const current = countryOf(country, locale())
    const name = el.getAttribute("label") ?? "Phone"
    el.classList.add("phone-input")
    attr(el, "aria-label", name)
    label.textContent = name
    flag.textContent = current.flag
    dial.textContent = current.dial
    attr(button, "aria-label", text.country(current))
    attr(search, "aria-label", text.search)
    attr(search, "placeholder", text.search)
    empty.textContent = text.noCountries
    if (combobox.value !== country) combobox.value = country
    attr(number, "placeholder", el.getAttribute("placeholder"))
    attr(number, "required", isOn(el, "required") ? "" : null)
    attr(number, "readonly", isOn(el, "readonly") ? "" : null)
    attr(number, "disabled", state.disabled ? "" : null)
    attr(combobox, "disabled", state.disabled || isOn(el, "readonly") ? "" : null)
    number.setCustomValidity(error ?? "")
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
    const key = [locale(), el.countries?.join(), el.preferredCountries?.join()].join("|")
    if (key !== listFor) {
      listFor = key
      list.replaceChildren(
        ...countryList({ locale: locale(), only: el.countries, preferred: el.preferredCountries }).map((item) =>
          h(
            "ui-combobox-item",
            { value: item.code, label: item.name, keywords: [item.code, item.dial, item.dial.slice(1)].join(",") },
            h("span", { class: "phone-input-flag", "aria-hidden": "true" }, item.flag),
            h("span", { class: "phone-input-name" }, item.name),
            h("bdi", { class: "phone-input-dial", dir: "ltr" }, item.dial),
          ),
        ),
      )
    }
  }

  paint()
  ;(el as unknown as { country: string }).country = country
  const stop = instance.subscribe(paint)
  const watch = new MutationObserver(paint)
  watch.observe(el, { attributeFilter: ["label", "placeholder", "description", "name", "form", "required", "readonly", "error", "locale"] })
  return () => {
    stop()
    watch.disconnect()
    requests.delete(el)
  }
}

function definePhoneInput() {
  createParts(phoneInput, {
    root: {
      tag: "uiset-phone-input",
      // Functions to call, not events to fire.
      kinds: { request: null, requestCountry: null },
      // Until the phone rules load, there's nothing to set a number with: say so.
      options: (el) => ({
        request: (text: string, country?: string) => {
          const asked = requests.get(el)
          return asked ? asked.value(text, country) : "The phone rules are still loading."
        },
        requestCountry: (query: string) => {
          const asked = requests.get(el)
          return asked ? asked.country(query) : "The phone rules are still loading."
        },
      }),
      api: ["setValue", "setCountry", "set"],
      render: holdRender((el, instance) => {
        // Its `value` stays live, as a text field's does; v-model hears `input` and `change`.
        reportPartInput(el, "valuechange", "valuechange", { follow: true })
        let stop: (() => void) | undefined
        let gone = false
        void loadRules().then((rules) => {
          if (!gone) stop = draw(el as PhoneInputElement, instance as unknown as PhoneInputInstance, rules)
        })
        return () => {
          gone = true
          stop?.()
        }
      }),
    },
  })
}

export { definePhoneInput, loadRules as loadPhoneRules }
export type { PhoneInputElement, UISetPhoneInputEvents }
