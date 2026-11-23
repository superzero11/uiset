// The address for Web Components, on the same primitive and rules as React's `AddressFields`:
// <uiset-address-fields label="Delivery address" section="shipping" default-country="GB">
// draws UI SDK's combobox for the country, then the fields that country uses, in its order.
import "@ui-sdk/web/combobox"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import { createParts, type UiChangeEvent, type UiElement } from "@ui-sdk/web"
import { addressFields, type AddressFieldsReason } from "@/registry/uiset/ui/address/address-fields"
import {
  addressCountries,
  addressLayout,
  addressMessages,
  checkAddress,
  emptyAddress,
  fillAddress,
  findCountry,
  findRegion,
  shownLabel,
  startCountry,
  tidyPostal,
  type AddressFieldName,
  type AddressMessages,
  type AddressPart,
  type AddressValue,
  type Region,
} from "@/registry/uiset/ui/address/address"
import { afterPress } from "@/registry/uiset/ui/shell/after-press"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/address/address.css"
import { attr, h, holdRender, isOn, reportPartInput } from "./dom"

/** What `<uiset-address-fields>` fires: `valuechange` with the whole address. */
type UISetAddressFieldsEvents = {
  valuechange: UiChangeEvent<AddressValue, AddressFieldsReason>
}

type AddressFieldsElement = UiElement<UISetAddressFieldsEvents> & {
  /** The whole address. Setting it fires nothing. */
  value: AddressValue
  /** Only these countries, by code. */
  countries?: readonly string[]
  /** These countries first in the list, by code. */
  preferredCountries?: readonly string[]
  /** Region lists of your own, by country: `[key, name, postal code start?][]`. */
  regions?: Record<string, readonly Region[]>
  /** The words it says, for other languages. */
  messages?: Partial<AddressMessages>
  disabled: boolean
  /** Shows what's missing or wrong, focus on the first; true when the address is whole. */
  check(): boolean
  /** Fill fields by name or label from code, through the same rules: a refusal throws with the reason. */
  api?: { fill(entries: Record<string, unknown>): string[] }
}

type AddressInstance = {
  get: () => { value: AddressValue | null; disabled: boolean }
  subscribe: (run: () => void) => () => void
}
type AddressApi = { set: (value: AddressValue, details: { reason: AddressFieldsReason }) => boolean; hold: (value: AddressValue) => void }
type Live = HTMLElement & { value: unknown; itemToLabel?: (value: string) => string }

const autofill: Record<AddressFieldName, string> = {
  country: "country-name",
  name: "name",
  line1: "address-line1",
  line2: "address-line2",
  district: "address-level3",
  city: "address-level2",
  region: "address-level1",
  postalCode: "postal-code",
}

const requests = new WeakMap<Element, (entries: Record<string, unknown>) => string[]>()
const fieldsFor = new WeakMap<Element, { value: string; label: string }[]>()

type Drawn = { set: (text: string) => void; show: (problem: string | null) => void; focus: () => void; root: HTMLElement }

/** A field with its label and its problem, shown only while there is one. */
function fieldShell(label: string, control: HTMLElement, part: AddressFieldName) {
  const problem = h("ui-field-error", { match: "true" })
  const root = h("ui-field", null, h("ui-field-label", null, label), control)
  const show = (text: string | null) => {
    ;(root as HTMLElement & { invalid?: boolean }).invalid = text ? true : undefined
    // In only while there's a problem, its text set first: an empty error fills itself.
    if (text) {
      if (problem.textContent !== text) problem.textContent = text
      if (!problem.isConnected) root.append(problem)
    } else problem.remove()
  }
  return { root: h("div", { class: "address-field", "data-address-field": part }, root), show }
}

/** A list to choose from by typing: the country, and a region where the country has a list. */
function choice(
  label: string,
  items: readonly { value: string; label: string; flag?: string; keywords?: string[] }[],
  { autocomplete, required, empty, showList, find, choose }: { autocomplete: string; required: boolean; empty: string; showList: string; find: (text: string) => string | undefined; choose: (value: string) => void },
) {
  const flag = h("span", { class: "address-flag", "aria-hidden": "true" })
  const input = h("input", { autocomplete, class: "address-choice-input", ...(required ? { required: "" } : {}) }) as HTMLInputElement
  const toggle = h("button", { type: "button", class: "address-choice-toggle", "aria-label": `${showList}: ${label}` }, iconElement("down"))
  const list = h(
    "ui-combobox-list",
    null,
    ...items.map((item) =>
      h(
        "ui-combobox-item",
        { value: item.value, label: item.label, ...(item.keywords ? { keywords: item.keywords.join(",") } : {}) },
        ...(item.flag ? [h("span", { class: "address-flag", "aria-hidden": "true" }, item.flag)] : []),
        h("span", { class: "address-choice-name" }, item.label),
      ),
    ),
  )
  const combobox = h(
    "ui-combobox",
    null,
    h("div", { class: "address-choice" }, flag, h("ui-combobox-input", null, input), h("ui-combobox-trigger", null, toggle)),
    h("ui-combobox-content", { hidden: "", class: "address-choices" }, h("ui-combobox-empty", null, empty), list),
  ) as Live
  combobox.itemToLabel = (value) => items.find((item) => item.value === value)?.label ?? value
  combobox.addEventListener("valuechange", ((event: UiChangeEvent<string | null>) => {
    if (event.detail.value) choose(event.detail.value)
    // Emptying the text asks for no value; an address keeps its country (and a region from
    // its list), so the change is refused and the chosen one shows again.
    else event.preventDefault()
  }) as EventListener)
  // Autofill and a whole name typed out choose the item at once.
  combobox.addEventListener("querychange", ((event: UiChangeEvent<string>) => {
    if (event.detail.reason !== "input-change") return
    const found = find(event.detail.value)
    if (found && found !== combobox.value) choose(found)
  }) as EventListener)
  const set = (value: string) => {
    if (combobox.value !== (value || null)) combobox.value = value || null
    const chosen = items.find((item) => item.value === value)
    flag.textContent = chosen?.flag ?? ""
    flag.hidden = !chosen?.flag
  }
  return { combobox, input, set }
}

function draw(el: AddressFieldsElement, instance: AddressInstance) {
  const api = () => (el as unknown as { api: AddressApi }).api
  const words = () => ({ ...addressMessages, ...el.messages })
  const locale = () => el.getAttribute("locale") ?? undefined
  const section = () => (el.getAttribute("section") === "billing" ? "billing" : "shipping")
  let current: AddressValue = instance.get().value ?? emptyAddress(startCountry(el.getAttribute("default-country") ?? undefined, locale()))
  let found: Partial<Record<AddressFieldName, string>> = {}
  let errors: Partial<Record<AddressFieldName, string>> = {}
  const drawn = new Map<AddressFieldName, Drawn>()

  // The fields are the person's; an agent fills the address through its own action (address-fields.ts).
  const body = h("div", { class: "address-fields-body", "data-agent-hidden": "" })
  const rows = h("div", { class: "address-fields-body" })
  el.replaceChildren(body)

  const report = (next: AddressValue, reason: AddressFieldsReason) => {
    current = next
    api().set(next, { reason })
  }
  const showProblems = () => {
    for (const [field, part] of drawn) part.show(found[field] ?? errors[field] ?? null)
  }

  const countryPart = (() => {
    const text = words()
    const list = addressCountries({ locale: locale(), only: el.countries, preferred: el.preferredCountries })
    const pick = choice(
      text.country,
      list.map((country) => ({ value: country.code, label: country.name, flag: country.flag, keywords: [country.code] })),
      {
        autocomplete: `${section()} ${autofill.country}`,
        required: true,
        empty: text.noCountries,
        showList: text.showList,
        find: (query) => findCountry(query, { locale: locale(), only: el.countries }),
        choose: (code) => {
          if (code === current.country) return
          const layout = addressLayout(code, { messages: words(), regions: el.regions })
          const region = layout.regions && !layout.regions.some(([key]) => key === current.region) ? "" : current.region
          found = {}
          errors = {}
          report({ ...current, country: code, region }, "input")
          drawRows()
        },
      },
    )
    const shell = fieldShell(text.country, pick.combobox, "country")
    drawn.set("country", { set: pick.set, show: shell.show, focus: () => pick.input.focus(), root: shell.root })
    return shell.root
  })()

  let rowsFor = ""
  function drawRows() {
    const text = words()
    const layout = addressLayout(current.country, { messages: text, regions: el.regions })
    rowsFor = `${current.country}|${locale()}`
    for (const field of [...drawn.keys()]) if (field !== "country") drawn.delete(field)
    const make = (part: AddressFieldName) => {
      const label = shownLabel(layout, part, text)
      const required = layout.required.has(part)
      const token = `${section()} ${autofill[part]}`
      if (part === "region" && layout.regions) {
        const regions = layout.regions
        const pick = choice(label, regions.map(([key, name]) => ({ value: key, label: name, keywords: [key] })), {
          autocomplete: token,
          required,
          empty: text.noRegions,
          showList: text.showList,
          find: (query) => findRegion(query, regions),
          choose: (key) => {
            if (key === current.region) return
            delete found.region
            delete found.postalCode
            report({ ...current, region: key }, "input")
            showProblems()
          },
        })
        pick.set(current.region)
        const shell = fieldShell(label, pick.combobox, part)
        drawn.set(part, { set: pick.set, show: shell.show, focus: () => pick.input.focus(), root: shell.root })
        return shell.root
      }
      const numeric = part === "postalCode" && /^\d+$/.test(layout.postal.example ?? "")
      const input = h("input", {
        autocomplete: token,
        ...(required ? { required: "" } : {}),
        ...(numeric ? { inputmode: "numeric" } : {}),
        ...(part === "postalCode" && layout.postal.example ? { placeholder: layout.postal.example } : {}),
      }) as HTMLInputElement
      input.value = current[part]
      input.addEventListener("input", () => {
        if (found[part] || errors[part]) {
          delete found[part]
          delete errors[part]
          showProblems()
        }
        report({ ...current, [part]: input.value }, "input")
      })
      input.addEventListener("blur", () => {
        if (part === "postalCode" && input.value && tidyPostal(input.value, layout) !== input.value) {
          input.value = tidyPostal(input.value, layout)
          report({ ...current, postalCode: input.value }, "input")
        }
        afterPress(() => {
          const problem = current[part].trim() ? checkAddress(current, { messages: words(), regions: el.regions, locale: locale() })[part] : undefined
          if (problem) found[part] = problem
          else delete found[part]
          showProblems()
        })
      })
      const shell = fieldShell(label, h("ui-input", null, input), part)
      drawn.set(part, {
        set: (value) => {
          if (input.value !== value) input.value = value
        },
        show: shell.show,
        focus: () => input.focus(),
        root: shell.root,
      })
      return shell.root
    }
    rows.replaceChildren(
      make("name"),
      ...layout.rows.map((row) => (row.length === 1 ? make(row[0] as AddressPart) : h("div", { class: "address-row", "data-fields": String(row.length) }, ...row.map(make)))),
    )
    fieldsFor.set(el, layout.fields.map((part) => ({ value: part, label: layout.labels[part] })))
    attr(el, "data-country", current.country)
    showProblems()
  }

  body.append(countryPart, rows)
  drawRows()

  requests.set(el, (entries) => {
    const result = fillAddress(current, entries, { messages: words(), regions: el.regions, locale: locale(), countries: el.countries })
    if (result.filled.length) {
      const redraw = result.value.country !== current.country
      report(result.value, "fill")
      if (redraw) drawRows()
      paint()
    }
    // What's filled but wrong shows under its field, as a person's would; what's missing waits for a check.
    const all = checkAddress(result.value, { messages: words(), regions: el.regions, locale: locale() })
    found = Object.fromEntries(Object.entries(all).filter(([field]) => result.value[field as AddressFieldName].trim()))
    errors = {}
    showProblems()
    const problems = [...result.problems, ...Object.values(found)]
    if (problems.length) throw new Error(problems.join(" "))
    return result.filled
  })

  ;(el as unknown as { check: () => boolean }).check = () => {
    errors = checkAddress(current, { messages: words(), regions: el.regions, locale: locale() })
    found = {}
    showProblems()
    const layout = addressLayout(current.country, { messages: words(), regions: el.regions })
    const first = layout.fields.find((field) => errors[field])
    if (first) drawn.get(first)?.focus()
    return !first
  }

  // UI SDK's element keeps an object option as a plain property, and setting one draws the
  // element again: `value` is the address as drawn, and a page's set redraws only the fields.
  // The element's api comes once this first draw is done.
  queueMicrotask(() => api()?.hold(current))
  Object.defineProperty(el, "value", {
    configurable: true,
    enumerable: true,
    get: () => current,
    set: (next: AddressValue) => {
      current = { ...emptyAddress(current.country), ...next }
      found = {}
      errors = {}
      api().hold(current)
      paint()
    },
  })

  function paint() {
    const state = instance.get()
    if (`${current.country}|${locale()}` !== rowsFor) drawRows()
    for (const [field, part] of drawn) part.set(current[field])
    el.classList.add("address-fields")
    attr(el, "aria-label", el.getAttribute("label") ?? words().label)
    attr(body, "inert", state.disabled ? "" : null)
    attr(el, "data-disabled", state.disabled || isOn(el, "disabled") ? "" : null)
  }

  paint()
  const stop = instance.subscribe(paint)
  const watch = new MutationObserver(paint)
  watch.observe(el, { attributeFilter: ["label", "locale"] })
  return () => {
    stop()
    watch.disconnect()
    requests.delete(el)
    fieldsFor.delete(el)
    delete (el as unknown as { value?: AddressValue }).value
  }
}

function defineAddressFields() {
  createParts(addressFields, {
    root: {
      tag: "uiset-address-fields",
      // Functions to call, not events to fire.
      kinds: { request: null, fields: null },
      options: (el) => ({
        fields: () => fieldsFor.get(el) ?? [],
        request: (entries: Record<string, unknown>) => {
          const asked = requests.get(el)
          if (!asked) throw new Error("It isn't on the page yet.")
          return asked(entries)
        },
      }),
      api: ["fill", "set", "hold"],
      render: holdRender((el, instance) => {
        reportPartInput(el, "valuechange")
        return draw(el as AddressFieldsElement, instance as unknown as AddressInstance)
      }),
    },
  })
}

export { defineAddressFields }
export type { AddressFieldsElement, UISetAddressFieldsEvents }
