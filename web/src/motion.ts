// The Motion pieces for Web Components, on the same helpers as React's
// (design/motion-pieces-plan.md):
// <uiset-number-ticker value from locale>, <uiset-text-reveal text by>, <uiset-thinking> and
// <uiset-crossfade value> with children marked data-value.
import { swap } from "@/registry/uiset/ui/motion/crossfade"
import { setReveal, type RevealBy } from "@/registry/uiset/ui/motion/reveal"
import { setTicker } from "@/registry/uiset/ui/motion/ticker"
import "@/registry/uiset/ui/shell/shell.css"
import "@/registry/uiset/ui/motion/motion.css"
import { defineElement, ElementBase, upgradeProperties } from "./dom"

/** <uiset-number-ticker value="12840" from="0" locale="en-US">; `format` is a property. */
class UISetNumberTicker extends ElementBase {
  static observedAttributes = ["value", "from", "locale"]
  #format?: Intl.NumberFormatOptions | ((value: number) => string)

  get value() {
    return Number(this.getAttribute("value") ?? 0)
  }
  set value(v: number) {
    this.setAttribute("value", String(v))
  }
  get format() {
    return this.#format
  }
  set format(f: Intl.NumberFormatOptions | ((value: number) => string) | undefined) {
    this.#format = f
    this.render()
  }

  connectedCallback() {
    upgradeProperties(this, ["value", "format"])
    this.render()
  }
  attributeChangedCallback() {
    this.render()
  }

  private render() {
    if (!this.isConnected) return
    const f = this.#format
    const numbers = typeof f === "function" ? null : new Intl.NumberFormat(this.getAttribute("locale") ?? undefined, f)
    const from = this.getAttribute("from")
    setTicker(this, {
      value: this.value,
      from: from === null ? undefined : Number(from),
      format: typeof f === "function" ? f : (v) => numbers!.format(v),
    })
  }
}

/** <uiset-text-reveal text="…" by="word|letter">: setting `text` reveals what's new. */
class UISetTextReveal extends ElementBase {
  static observedAttributes = ["text", "by"]
  #text?: string

  get text() {
    return this.#text ?? this.getAttribute("text") ?? ""
  }
  set text(t: string) {
    this.#text = t
    this.render()
  }

  connectedCallback() {
    upgradeProperties(this, ["text"])
    // Text written inside the element is its first text.
    if (this.#text === undefined && !this.hasAttribute("text") && this.textContent?.trim()) this.#text = this.textContent
    this.render()
  }
  attributeChangedCallback(name: string) {
    if (name === "text") this.#text = undefined
    this.render()
  }

  private render() {
    if (!this.isConnected) return
    const by = this.getAttribute("by")
    setReveal(this, this.text, by === "word" || by === "letter" ? (by as RevealBy) : undefined)
  }
}

/** <uiset-thinking>Searching the docs…</uiset-thinking>: a status, said once. */
class UISetThinking extends ElementBase {
  connectedCallback() {
    if (this.querySelector(".thinking-label")) return
    const label = document.createElement("span")
    label.className = "thinking-label"
    label.textContent = this.textContent?.trim() || "Thinking…"
    const mark = document.createElement("span")
    mark.className = "thinking-mark"
    mark.setAttribute("aria-hidden", "true")
    mark.append(document.createElement("span"), document.createElement("span"), document.createElement("span"))
    this.setAttribute("role", "status")
    this.dataset.slot = "thinking"
    this.replaceChildren(label, mark)
  }
}

/** <uiset-crossfade value="pro"> shows the child with data-value="pro", swapping in place. */
class UISetCrossfade extends ElementBase {
  static observedAttributes = ["value"]
  #shown?: HTMLElement
  #stop = () => {}

  get value() {
    return this.getAttribute("value") ?? ""
  }
  set value(v: string) {
    this.setAttribute("value", v)
  }

  connectedCallback() {
    upgradeProperties(this, ["value"])
    this.dataset.slot = "crossfade"
    this.show(false)
  }
  attributeChangedCallback() {
    this.show(true)
  }

  private show(animate: boolean) {
    if (!this.isConnected) return
    const panes = [...this.children] as HTMLElement[]
    const incoming = panes.find((p) => p.dataset.value === this.value) ?? panes[0]
    if (!incoming || incoming === this.#shown) return
    const outgoing = animate ? this.#shown : undefined
    this.#stop()
    for (const pane of panes) pane.hidden = pane !== incoming && pane !== outgoing
    this.#shown = incoming
    this.#stop = swap(this, incoming, outgoing ?? null, () => {
      if (outgoing) {
        outgoing.hidden = true
        outgoing.inert = false
        outgoing.removeAttribute("aria-hidden")
      }
    })
  }
}

function defineMotion() {
  defineElement("uiset-number-ticker", UISetNumberTicker)
  defineElement("uiset-text-reveal", UISetTextReveal)
  defineElement("uiset-thinking", UISetThinking)
  defineElement("uiset-crossfade", UISetCrossfade)
}

export { defineMotion, UISetCrossfade, UISetNumberTicker, UISetTextReveal, UISetThinking }
