// Three small parts for Web Components that match their React twins: <uiset-search-field>
// (an icon, a clear button, and a key that focuses it from anywhere), <uiset-copy-button>
// (copies and says so), and <uiset-stepper> (the steps of a flow, as buttons). They use the
// same classes as React, so shell.css styles both.
import { announce, ariaKeyshortcuts, formatShortcut } from "@ui-sdk/core"
import { registerShortcut } from "@ui-sdk/core/shortcuts"
import "@ui-sdk/web/button"
import "@ui-sdk/web/input"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/shell/shell.css"
import { attr, h, upgradeProperties } from "./dom"

/**
 * <uiset-search-field label="Search mail" placeholder="Search…" shortcut="/" value=""> fires
 * `valuechange` with `{ value }` as people type or clear it. `shortcut` focuses it from
 * anywhere ("/" by default; `shortcut=""` for none); plain keys never fire while someone
 * types in another field. The clear button is hidden from agents: the field offers "clear".
 */
class UISetSearchField extends HTMLElement {
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

  private get label() {
    return this.getAttribute("label") ?? "Search"
  }
  private get shortcut() {
    const s = this.getAttribute("shortcut")
    return s === null ? "/" : s
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
        this.sync()
        this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: "" } }))
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
class UISetCopyButton extends HTMLElement {
  static observedAttributes = ["label", "copied-label"]
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
    await navigator.clipboard.writeText(this.getAttribute("value") ?? "")
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
    this.#button!.replaceChildren(iconElement(this.#copied ? "check" : "copy"), label)
  }
}

type Step = { value: string; label: string; description?: string }

/**
 * <uiset-stepper label="Progress" value="details" linear> shows `steps` ({ value, label,
 * description? }) as buttons, the current one with aria-current="step". Choosing one sets
 * `value` and fires `valuechange` with `{ value }`. With `linear` (on unless
 * linear="false"), steps after the current one can't be chosen until it's reached.
 */
class UISetStepper extends HTMLElement {
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

  connectedCallback() {
    if (!this.#list) {
      this.#list = h("ol")
      this.replaceChildren(h("nav", { class: "stepper" }, this.#list))
      upgradeProperties(this, ["steps"])
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
            disabled: linear && index > current,
          },
          h("span", { class: "stepper-mark", "aria-hidden": "true" }, state === "complete" ? iconElement("check") : String(index + 1)),
          h("span", { class: "stepper-text" }, h("span", { class: "stepper-label" }, step.label), step.description ? h("span", { class: "stepper-description" }, step.description) : null),
          state === "complete" ? h("span", { class: "uiset-visually-hidden" }, " (done)") : null,
        ) as HTMLButtonElement
        button.addEventListener("click", () => {
          this.setAttribute("value", step.value)
          this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: step.value } }))
        })
        return h("li", { "data-state": state }, h("ui-button", null, button))
      }),
    )
    if (focused) this.querySelector<HTMLElement>(`[data-step="${CSS.escape(focused)}"]`)?.focus()
  }
}

function defineShellParts() {
  customElements.define("uiset-search-field", UISetSearchField)
  customElements.define("uiset-copy-button", UISetCopyButton)
  customElements.define("uiset-stepper", UISetStepper)
}

export { defineShellParts }
export type { Step as StepperStep }
