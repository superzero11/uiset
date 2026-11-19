// Small parts for Web Components that match their React twins: <uiset-search-field> (an icon,
// a clear button, and a key that focuses it from anywhere), <uiset-copy-button> (copies and
// says so), <uiset-stepper> (the steps of a flow, as buttons), <uiset-textarea-count> (a
// textarea's count of its limit), <uiset-password-rules> (rules that tick off) and
// <uiset-confirm-button> (asks for a second press). They use the same classes as React, so the same styles dress
// both.
import { announce, ariaKeyshortcuts, formatShortcut } from "@ui-sdk/core"
import { registerShortcut } from "@ui-sdk/core/shortcuts"
import "@ui-sdk/web/button"
import "@ui-sdk/web/input"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/shell/shell.css"
import { attr, defineElement, ElementBase, Evented, h, reportInput, upgradeProperties } from "./dom"

/**
 * <uiset-search-field label="Search mail" placeholder="Search…" shortcut="/" value=""> fires
 * `valuechange` with `{ value }` as people type or clear it. `shortcut` focuses it from
 * anywhere ("/" by default; `shortcut=""` for none); plain keys never fire while someone
 * types in another field. The clear button is hidden from agents: the field offers "clear".
 */
/** What `<uiset-search-field>` fires: `valuechange` as the text changes. */
type UISetSearchFieldEvents = { valuechange: CustomEvent<{ value: string }> }

class UISetSearchField extends Evented<UISetSearchFieldEvents>() {
  static observedAttributes = ["label", "placeholder", "shortcut", "name"]
  #dom?: { root: HTMLElement; input: HTMLInputElement; clear: HTMLElement; hint: HTMLElement }
  #unregister?: () => void

  get value() {
    return this.#dom?.input.value ?? this.getAttribute("value") ?? ""
  }
  set value(v: string) {
    if (!this.#dom) {
      this.setAttribute("value", v)
      return
    }
    this.#dom.input.value = v ?? ""
    this.sync()
  }

  // Attributes that are properties too, so a framework that sets a member it finds (Vue)
  // still reaches the attribute.
  get label(): string {
    return this.getAttribute("label") ?? "Search"
  }
  set label(value: string | null) {
    attr(this, "label", value)
  }
  get shortcut(): string {
    const s = this.getAttribute("shortcut")
    return s === null ? "/" : s
  }
  set shortcut(value: string | null) {
    attr(this, "shortcut", value)
  }

  connectedCallback() {
    if (!this.#dom) {
      const input = h("input", { type: "search", autocomplete: "off", spellcheck: "false", value: this.getAttribute("value") ?? "" }) as HTMLInputElement
      input.addEventListener("input", () => {
        this.sync()
        this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: input.value } }))
      })
      const clearButton = h("button", { type: "button", "data-variant": "ghost", class: "search-field-clear", "data-agent-hidden": "" }, iconElement("close"))
      clearButton.addEventListener("click", () => {
        input.value = ""
        // As if the text had been deleted by hand: `input` is what two-way bindings listen
        // for (Vue's v-model), and the listener above turns it into `valuechange`.
        input.dispatchEvent(new Event("input", { bubbles: true }))
        input.focus()
      })
      const clear = h("ui-button", null, clearButton)
      const hint = h("kbd", { class: "kbd search-field-hint", "aria-hidden": "true" })
      const root = h("div", { class: "search-field" }, iconElement("search", "search-field-icon"), h("ui-input", null, input), clear, hint)
      this.replaceChildren(root)
      this.#dom = { root, input, clear, hint }
      upgradeProperties(this, ["value"])
    }
    this.register()
    this.sync()
  }

  disconnectedCallback() {
    this.#unregister?.()
    this.#unregister = undefined
  }

  attributeChangedCallback(name: string) {
    if (!this.#dom) return
    if (name === "shortcut" && this.isConnected) this.register()
    this.sync()
  }

  /** Focuses the text box. */
  override focus(options?: FocusOptions) {
    this.#dom?.input.focus(options)
  }

  private register() {
    this.#unregister?.()
    this.#unregister = this.shortcut ? registerShortcut(this.shortcut, () => this.focus(), { description: `Focus ${this.label.toLowerCase()}` }) : undefined
  }

  private sync() {
    const dom = this.#dom!
    const filled = dom.input.value !== ""
    attr(dom.root, "data-filled", filled)
    attr(dom.input, "aria-label", this.label)
    attr(dom.input, "placeholder", this.getAttribute("placeholder"))
    attr(dom.input, "name", this.getAttribute("name"))
    attr(dom.input, "aria-keyshortcuts", this.shortcut ? ariaKeyshortcuts(this.shortcut) : null)
    attr(dom.clear.firstElementChild!, "aria-label", `Clear ${this.label.toLowerCase()}`)
    dom.clear.style.display = filled ? "" : "none"
    dom.hint.textContent = this.shortcut ? formatShortcut(this.shortcut) : ""
    dom.hint.style.display = !filled && this.shortcut ? "" : "none"
  }
}

/** <uiset-copy-button value="npm i @uiset/web" label="Copy" copied-label="Copied">: copies `value`, and says so. */
class UISetCopyButton extends ElementBase {
  static observedAttributes = ["label", "copied-label", "full-label"]
  #button?: HTMLButtonElement
  #copied = false
  #timer?: ReturnType<typeof setTimeout>

  connectedCallback() {
    if (!this.#button) {
      this.#button = h("button", { type: "button", "data-variant": "outline", class: "copy-button" }) as HTMLButtonElement
      this.#button.addEventListener("click", () => void this.copy())
      this.replaceChildren(h("ui-button", null, this.#button))
    }
    this.draw()
  }

  attributeChangedCallback() {
    if (this.#button) this.draw()
  }

  private async copy() {
    try {
      await navigator.clipboard.writeText(this.getAttribute("value") ?? "")
    } catch {
      // The browser refused (no permission, an insecure page): say so rather than nothing.
      announce(this.getAttribute("failed-label") ?? "Couldn't copy")
      return
    }
    this.#copied = true
    announce(this.getAttribute("copied-label") ?? "Copied")
    this.draw()
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => {
      this.#copied = false
      this.draw()
    }, 1600)
  }

  private draw() {
    const label = this.#copied ? (this.getAttribute("copied-label") ?? "Copied") : (this.getAttribute("label") ?? "Copy")
    // The label in its own element: a labelled button whose only element is an icon is sized
    // as a square icon button, which would squeeze the visible label out.
    this.#button!.replaceChildren(iconElement(this.#copied ? "check" : "copy"), h("span", null, label))
    // A fuller name where several share a page, like "Copy app.tsx". It starts with the
    // visible label, so people who speak the label still find it.
    attr(this.#button!, "aria-label", this.#copied ? null : this.getAttribute("full-label"))
  }
}

type Step = { value: string; label: string; description?: string }

/**
 * <uiset-stepper label="Progress" value="details" linear> shows `steps` ({ value, label,
 * description? }) as buttons, the current one with aria-current="step". Choosing one sets
 * `value` and fires `valuechange` with `{ value }`. With `linear` (on unless
 * linear="false"), steps after the current one can't be chosen until it's reached.
 */
/** What `<uiset-stepper>` fires: `valuechange` when a step is chosen. */
type UISetStepperEvents = { valuechange: CustomEvent<{ value: string }> }

class UISetStepper extends Evented<UISetStepperEvents>() {
  static observedAttributes = ["label", "value", "linear"]
  #steps: Step[] = []
  #list?: HTMLElement

  get steps() {
    return this.#steps
  }
  set steps(v: Step[]) {
    this.#steps = v ?? []
    if (this.#list) this.draw()
  }
  /** The current step's `value`. An attribute and a property. */
  get value() {
    return this.getAttribute("value") ?? ""
  }
  set value(v: string | null) {
    attr(this, "value", v)
  }

  connectedCallback() {
    if (!this.#list) {
      this.#list = h("ol")
      this.replaceChildren(h("nav", { class: "stepper" }, this.#list))
      upgradeProperties(this, ["steps", "value"])
    }
    this.draw()
  }

  attributeChangedCallback() {
    if (this.#list) this.draw()
  }

  private draw() {
    const nav = this.#list!.parentElement!
    attr(nav, "aria-label", this.getAttribute("label") ?? "Progress")
    const value = this.getAttribute("value")
    const current = Math.max(0, this.#steps.findIndex((step) => step.value === value))
    const linear = this.getAttribute("linear") !== "false"
    // Focus stays on the step that had it, across a redraw.
    const focused = this.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.step : undefined
    this.#list!.replaceChildren(
      ...this.#steps.map((step, index) => {
        const state = index < current ? "complete" : index === current ? "current" : "upcoming"
        const button = h(
          "button",
          {
            type: "button",
            "data-variant": "ghost",
            class: "stepper-step",
            "data-step": step.value,
            "aria-current": state === "current" ? "step" : null,
          },
          h("span", { class: "stepper-mark", "aria-hidden": "true" }, state === "complete" ? iconElement("check") : String(index + 1)),
          h("span", { class: "stepper-text" }, h("span", { class: "stepper-label" }, step.label), step.description ? h("span", { class: "stepper-description" }, step.description) : null),
          state === "complete" ? h("span", { class: "uiset-visually-hidden" }, " (done)") : null,
        ) as HTMLButtonElement
        button.addEventListener("click", () => {
          this.setAttribute("value", step.value)
          this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: step.value } }))
          reportInput(this)
        })
        // UI SDK's button takes `disabled` on the wrapper, and marks the button for the skins.
        return h("li", { "data-state": state }, h("ui-button", { disabled: linear && index > current }, button))
      }),
    )
    if (focused) this.querySelector<HTMLElement>(`[data-step="${CSS.escape(focused)}"]`)?.focus()
  }
}

type UISetTextareaCountMessages = {
  count: (length: number, max: number) => string
  left: (left: number) => string
  full: string
}

/**
 * <uiset-textarea-count max="160" warn-at="20"> counts its field's textarea against the limit, as
 * people type. Put it in the field's `<ui-field-description class="uiset-textarea-count">`, so a
 * screen reader hears it with the textarea; near the limit it says how many are left, once at
 * `warn-at` and once at none, not on every key. With no `max` it takes the textarea's maxlength.
 * `messages` translates its words.
 */
class UISetTextareaCount extends ElementBase {
  static observedAttributes = ["max", "warn-at"]
  messages: UISetTextareaCountMessages = {
    count: (length, max) => `${length} / ${max} characters`,
    left: (left) => `${left} ${left === 1 ? "character" : "characters"} left`,
    full: "No characters left",
  }
  #textarea: HTMLTextAreaElement | null = null
  #band = "room"
  #onInput = () => this.draw(true)

  connectedCallback() {
    upgradeProperties(this, ["messages"])
    this.#textarea = this.closest("ui-field")?.querySelector("textarea") ?? null
    this.#textarea?.addEventListener("input", this.#onInput)
    this.draw(false)
  }

  disconnectedCallback() {
    this.#textarea?.removeEventListener("input", this.#onInput)
  }

  attributeChangedCallback() {
    if (this.isConnected) this.draw(false)
  }

  private draw(speak: boolean) {
    const length = this.#textarea?.value.length ?? 0
    const max = Number(this.getAttribute("max")) || Math.max(this.#textarea?.maxLength ?? 0, 0)
    const left = max - length
    const band = left <= 0 ? "full" : left <= Number(this.getAttribute("warn-at") ?? 20) ? "near" : "room"
    if (speak && band !== this.#band) {
      if (band === "near" && this.#band === "room") announce(this.messages.left(left))
      if (band === "full") announce(this.messages.full)
    }
    this.#band = band
    attr(this, "data-near", band === "room" ? null : "")
    attr(this, "data-full", band === "full" ? "" : null)
    this.textContent = this.messages.count(length, max)
  }
}

type UISetPasswordRulesMessages = { met: string; unmet: string; allMet: string }

const SVG = "http://www.w3.org/2000/svg"
/** React's PasswordRules marks: a check for a met rule, a dot for one to do. */
const ruleMark = (met: boolean) => {
  const svg = document.createElementNS(SVG, "svg")
  svg.setAttribute("viewBox", "0 0 16 16")
  svg.setAttribute("aria-hidden", "true")
  const mark = document.createElementNS(SVG, met ? "path" : "circle")
  if (met) mark.setAttribute("d", "M3.5 8.5 6.5 11.5 12.5 4.5")
  else for (const [name, value] of [["cx", "8"], ["cy", "8"], ["r", "2.5"]] as const) mark.setAttribute(name, value)
  svg.append(mark)
  return svg
}

/**
 * <uiset-password-rules label="Password rules"> lists the rules a new password has to meet, as
 * `<li>` children with `data-min-length="12"`, `data-pattern="\d"` (a regular expression) or
 * both. It reads its field's password input as people type, marks each rule `data-met`, says
 * "Done" or "To do" to screen readers, and announces a rule that changes, once.
 * `messages` translates its words.
 */
class UISetPasswordRules extends ElementBase {
  messages: UISetPasswordRulesMessages = { met: "Done", unmet: "To do", allMet: "Every rule is met" }
  #input: HTMLInputElement | null = null
  #key = ""
  #onInput = () => this.draw(true)

  connectedCallback() {
    upgradeProperties(this, ["messages"])
    this.classList.add("uiset-password-rules")
    this.setAttribute("role", "list")
    this.setAttribute("aria-label", this.getAttribute("label") ?? "Password rules")
    const field = this.closest("ui-field")
    this.#input = field?.querySelector("ui-password-input input") ?? field?.querySelector('input[type="password"]') ?? null
    this.#input?.addEventListener("input", this.#onInput)
    this.draw(false)
  }

  disconnectedCallback() {
    this.#input?.removeEventListener("input", this.#onInput)
  }

  private draw(speak: boolean) {
    const value = this.#input?.value ?? ""
    const rules = Array.from(this.querySelectorAll<HTMLLIElement>(":scope > li"))
    const met = rules.map((li) => {
      li.dataset.rule ??= li.textContent?.trim() ?? ""
      const pattern = li.dataset.pattern
      return value.length >= Number(li.dataset.minLength ?? 0) && (!pattern || new RegExp(pattern).test(value))
    })
    rules.forEach((li, i) => {
      li.setAttribute("role", "listitem")
      attr(li, "data-met", met[i] ? "" : null)
      li.replaceChildren(ruleMark(met[i]!), h("span", { class: "uiset-password-rules-state" }, `${met[i] ? this.messages.met : this.messages.unmet}: `), li.dataset.rule ?? "")
    })
    const key = met.map(Number).join("")
    const before = this.#key
    this.#key = key
    if (!speak || before === key) return
    if (!key.includes("0")) return announce(this.messages.allMet)
    announce(
      rules
        .filter((_, i) => before[i] !== key[i])
        .map((li) => `${key[rules.indexOf(li)] === "1" ? this.messages.met : this.messages.unmet}: ${li.dataset.rule}`)
        .join(". "),
    )
  }
}

/** What `<uiset-confirm-button>` fires: `confirm`, on the second press or an approved agent's. */
type UISetConfirmButtonEvents = { confirm: CustomEvent<{ source: string; waitUntil: (promise: Promise<unknown>) => void }> }

// A second press this soon after arming is a double-click or a held key, not a decision.
const SETTLE = 600

/**
 * <uiset-confirm-button confirm="Deletes the Atlas project" confirm-label="Press again to delete"
 * timeout="4000">Delete project</uiset-confirm-button>: for something hard to undo. The first
 * press arms it and says so; the second fires `confirm` with `{ source, waitUntil }`. It
 * disarms on Escape, when focus leaves, or after `timeout`. An agent's press acts at once, but
 * only once the person approves `confirm` (data-agent-confirm), so that approval is the second press.
 */
class UISetConfirmButton extends Evented<UISetConfirmButtonEvents>() {
  static observedAttributes = ["confirm", "confirm-label"]
  #button?: HTMLButtonElement
  #label = ""
  #armed = false
  #armedAt = 0
  #timer?: ReturnType<typeof setTimeout>

  connectedCallback() {
    if (!this.#button) {
      this.#label = this.textContent?.trim() ?? ""
      this.#button = h("button", { type: "button" }) as HTMLButtonElement
      const host = h("ui-button", null, this.#button)
      host.addEventListener("action", (event) => this.press(event as CustomEvent<{ source: string; waitUntil: (promise: Promise<unknown>) => void }>))
      this.#button.addEventListener("keydown", (event) => {
        if (!this.#armed || event.key !== "Escape") return
        event.stopPropagation()
        this.arm(false)
      })
      this.#button.addEventListener("blur", () => this.arm(false))
      this.replaceChildren(host)
    }
    this.draw()
  }

  disconnectedCallback() {
    clearTimeout(this.#timer)
  }

  attributeChangedCallback() {
    if (this.#button) this.draw()
  }

  private press(event: CustomEvent<{ source: string; waitUntil: (promise: Promise<unknown>) => void }>) {
    if (event.detail.source === "agent" || (this.#armed && Date.now() - this.#armedAt >= SETTLE)) {
      this.arm(false)
      this.dispatchEvent(new CustomEvent("confirm", { detail: event.detail }))
      return
    }
    if (this.#armed) return
    this.#armedAt = Date.now()
    this.arm(true)
    announce(this.getAttribute("confirm-label") ?? "Press again to confirm")
  }

  private arm(on: boolean) {
    this.#armed = on
    clearTimeout(this.#timer)
    if (on) this.#timer = setTimeout(() => this.arm(false), Number(this.getAttribute("timeout") ?? 4000))
    this.draw()
  }

  private draw() {
    const button = this.#button!
    button.textContent = this.#armed ? (this.getAttribute("confirm-label") ?? "Press again to confirm") : this.#label
    button.setAttribute("data-variant", this.#armed ? "destructive" : "outline")
    attr(button, "data-armed", this.#armed ? "" : null)
    attr(button, "data-agent-confirm", this.getAttribute("confirm"))
  }
}

function defineShellParts() {
  defineElement("uiset-search-field", UISetSearchField)
  defineElement("uiset-copy-button", UISetCopyButton)
  defineElement("uiset-stepper", UISetStepper)
  defineElement("uiset-textarea-count", UISetTextareaCount)
  defineElement("uiset-password-rules", UISetPasswordRules)
  defineElement("uiset-confirm-button", UISetConfirmButton)
}

export { defineShellParts }
export type { Step as StepperStep, UISetPasswordRulesMessages, UISetTextareaCountMessages }
export { UISetSearchField, UISetCopyButton, UISetStepper, UISetTextareaCount, UISetPasswordRules, UISetConfirmButton }
export type { UISetConfirmButtonEvents, UISetSearchFieldEvents, UISetStepperEvents }
