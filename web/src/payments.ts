// The Payments kit for Web Components, on the same sums, masks and checks as React's:
// <uiset-order-summary> lists an order's lines with a discount code and its sums,
// <uiset-payment-fields> asks how to pay, and <uiset-pay-button> pays, after a person says so
// when an agent presses it.
import { announce } from "@ui-sdk/core"
import "@ui-sdk/web/button"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/number-input"
import "@ui-sdk/web/radio"
import { cardBrand, cardCode, cardExpiry, cardNumber, iban, maskMessages, type MaskMessages } from "@/registry/uiset/ui/input-mask/masks"
import { moneyFormat, orderTotals, paymentMessages, type OrderDiscount, type OrderLine, type PaymentMessages } from "@/registry/uiset/ui/payments/order"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/payments/payments.css"
import { attr, defineElement, Evented, h, isOn, uid, upgradeProperties } from "./dom"
import type { MaskedInputElement } from "./input-mask"

type PaymentValue = {
  method: string
  card: { number: string; expiry: string; code: string; name: string }
  bank: { name: string; iban: string }
}
type PaymentFieldName = "card.number" | "card.expiry" | "card.code" | "card.name" | "bank.name" | "bank.iban"
type PaymentMethod = { id: string; label: string; description?: string; aside?: string }

const emptyPayment = (method = "card"): PaymentValue => ({ method, card: { number: "", expiry: "", code: "", name: "" }, bank: { name: "", iban: "" } })

/** What's missing or wrong, field by field: the same as React's `checkPayment`. */
function checkPayment(value: PaymentValue, words: PaymentMessages, masks: MaskMessages) {
  const problems: Partial<Record<PaymentFieldName, string>> = {}
  const need = (name: PaymentFieldName, text: string, label: string, check?: string | null) => {
    if (!text.trim()) problems[name] = words.required(label)
    else if (check) problems[name] = check
  }
  if (value.method === "card") {
    const { number, expiry, code, name } = value.card
    need("card.number", number, words.cardNumber, cardNumber().check(number, masks))
    need("card.expiry", expiry, words.expiry, cardExpiry().check(cardExpiry().keep(expiry), masks))
    need("card.code", code, words.code, cardCode({ brand: () => cardBrand(number) }).check(code, masks))
    need("card.name", name, words.nameOnCard)
  } else if (value.method === "bank") {
    need("bank.name", value.bank.name, words.accountHolder)
    need("bank.iban", value.bank.iban, words.iban, iban().check(value.bank.iban, masks))
  }
  return problems
}

const nativeButton = (text: string | Node, attrs: Record<string, unknown> = {}) => {
  const native = h("button", { type: "button", ...attrs }, text) as HTMLButtonElement
  return { wrap: h("ui-button", null, native), native }
}

/** A field of ours with its label, its input and, while there's a problem, its error. */
function textField(label: string, autocomplete: string) {
  const input = h("input", { autocomplete, required: "" }) as HTMLInputElement
  const problem = h("ui-field-error", { match: "true" })
  const root = h("ui-field", null, h("ui-field-label", null, label), h("ui-input", null, input))
  const show = (text: string | null) => {
    ;(root as HTMLElement & { invalid?: boolean }).invalid = text ? true : undefined
    // In only while there's a problem, its text set first: an empty error fills itself.
    if (text) {
      problem.textContent = text
      if (!problem.isConnected) root.append(problem)
    } else problem.remove()
  }
  return { root, input, show }
}

/* ------------------------------------------------------------------ the order */

type UISetOrderSummaryEvents = {
  quantitychange: CustomEvent<{ id: string; quantity: number }>
  discountchange: CustomEvent<{ discount: OrderDiscount | null }>
}

/**
 * <uiset-order-summary currency="EUR" locale="de-DE" shipping="6" tax="7.65" quantities>:
 * `lines`, `discount`, `applyCode` (returns the discount, or the reason it's refused) and
 * `messages` are properties; `total` reads the sum.
 */
class UISetOrderSummary extends Evented<UISetOrderSummaryEvents>() {
  static observedAttributes = ["currency", "locale", "shipping", "tax", "quantities", "heading"]
  #lines: OrderLine[] = []
  #discount: OrderDiscount | null = null
  #code = ""
  #codeError: string | null = null
  #titleId = uid("order-summary")
  #applyCode?: (code: string) => OrderDiscount | string | Promise<OrderDiscount | string>
  messages?: Partial<PaymentMessages>

  /** Applies a code: the discount, or the reason it's refused. With it, the summary takes codes. */
  get applyCode() {
    return this.#applyCode
  }
  set applyCode(apply: ((code: string) => OrderDiscount | string | Promise<OrderDiscount | string>) | undefined) {
    this.#applyCode = apply
    this.render()
  }

  get lines() {
    return this.#lines
  }
  set lines(lines: OrderLine[]) {
    this.#lines = [...lines]
    this.render()
  }
  get discount() {
    return this.#discount
  }
  set discount(discount: OrderDiscount | null) {
    this.#discount = discount
    this.render()
  }
  get total() {
    return this.#totals().total
  }

  #number(name: string) {
    const text = this.getAttribute(name)
    return text === null || text.trim() === "" || Number.isNaN(Number(text)) ? null : Number(text)
  }
  #money() {
    return moneyFormat(this.getAttribute("currency") ?? "USD", this.getAttribute("locale") ?? undefined)
  }
  #totals() {
    return orderTotals(this.#lines, { discount: this.#discount, shipping: this.#number("shipping"), tax: this.#number("tax"), decimals: this.#money().decimals })
  }

  connectedCallback() {
    upgradeProperties(this, ["lines", "discount", "applyCode", "messages"])
    this.render()
  }
  attributeChangedCallback() {
    this.render()
  }

  async #apply(input: HTMLInputElement) {
    const code = input.value.trim()
    if (!code || !this.#applyCode) return
    const result = await this.#applyCode(code)
    if (typeof result === "string") {
      this.#code = code
      this.#codeError = result
      announce(result)
    } else {
      this.#code = ""
      this.#codeError = null
      this.#discount = result
      this.dispatchEvent(new CustomEvent("discountchange", { detail: { discount: result }, bubbles: true }))
    }
    this.render()
    if (typeof result === "string") this.querySelector<HTMLInputElement>(".order-code input")?.focus()
  }

  render() {
    if (!this.isConnected) return
    const words = { ...paymentMessages, ...this.messages }
    const money = this.#money()
    const totals = this.#totals()
    const level = this.getAttribute("heading")
    const section = h("section", { class: "order-summary" })
    if (level === "false") attr(section, "aria-label", words.summary)
    else {
      attr(section, "aria-labelledby", this.#titleId)
      section.append(h(level === "3" ? "h3" : "h2", { id: this.#titleId, class: "order-summary-title" }, words.summary))
    }
    const steppers = isOn(this, "quantities")
    section.append(
      h(
        "ul",
        { class: "order-lines" },
        ...this.#lines.map((line) => {
          const text = h("div", { class: "order-line-text" }, h("span", { class: "order-line-name" }, line.name))
          if (line.detail) text.append(h("span", { class: "order-line-detail" }, line.detail))
          if (steppers) {
            const stepper = h(
              "ui-number-input",
              { class: "order-line-quantity", min: 1, max: 99, step: 1 },
              h(
                "ui-number-input-group",
                null,
                h("ui-number-input-decrement", null, h("button", { type: "button", "aria-label": "Decrease" })),
                h("ui-number-input-control", null, h("input", { "aria-label": words.quantity(line.name) })),
                h("ui-number-input-increment", null, h("button", { type: "button", "aria-label": "Increase" })),
              ),
            ) as HTMLElement & { value: number | null }
            stepper.value = line.quantity
            stepper.addEventListener("valuechange", (event) => {
              const quantity = (event as CustomEvent<{ value: number | null }>).detail.value
              if (!quantity) return
              this.#lines = this.#lines.map((each) => (each.id === line.id ? { ...each, quantity } : each))
              this.dispatchEvent(new CustomEvent("quantitychange", { detail: { id: line.id, quantity }, bubbles: true }))
              queueMicrotask(() => this.#paintTotals())
            })
            text.append(stepper)
          } else text.append(h("span", { class: "order-line-detail" }, words.quantityShort(line.quantity)))
          const item = h("li", { class: "order-line", "data-line": line.id })
          if (line.image) item.append(h("img", { class: "order-line-image", src: line.image, alt: "", width: 48, height: 48 }))
          item.append(text, h("span", { class: "order-line-amount" }, money.format(line.price * line.quantity)))
          return item
        }),
      ),
    )
    if (this.#applyCode) {
      if (this.#discount) {
        const applied = h("p", { class: "order-code-applied" }, iconElement("check"), h("span", null, this.#discount.code))
        const remove = nativeButton(iconElement("close"), { "aria-label": words.removeCode(this.#discount.code), "data-variant": "ghost" })
        remove.native.addEventListener("click", () => {
          this.#discount = null
          this.dispatchEvent(new CustomEvent("discountchange", { detail: { discount: null }, bubbles: true }))
          this.render()
        })
        applied.append(remove.wrap)
        section.append(applied)
      } else {
        const field = textField(words.discountCode, "off")
        field.root.classList.add("order-code")
        field.input.removeAttribute("required")
        field.input.value = this.#code
        const apply = nativeButton(words.apply, { "data-variant": "outline" })
        apply.native.addEventListener("click", () => void this.#apply(field.input))
        field.input.addEventListener("keydown", (event) => {
          // Enter applies the code, without sending a form the summary sits in.
          if (event.key === "Enter") {
            event.preventDefault()
            void this.#apply(field.input)
          }
        })
        field.input.addEventListener("input", () => {
          this.#code = field.input.value
          if (this.#codeError) {
            this.#codeError = null
            field.show(null)
          }
        })
        const input = field.root.querySelector("ui-input")!
        const codeRow = h("div", { class: "order-code-row" })
        input.before(codeRow)
        codeRow.append(input, apply.wrap)
        field.show(this.#codeError)
        section.append(field.root)
      }
    }
    const row = (term: string, value: Node | string, className?: string) => h("div", className ? { class: className } : null, h("dt", null, term), h("dd", null, value))
    const later = (text: string) => h("span", { class: "order-later" }, text)
    const shipping = this.#number("shipping")
    const tax = this.#number("tax")
    const totalsList = h(
      "dl",
      { class: "order-totals" },
      row(words.subtotal, money.format(totals.subtotal)),
      ...(this.#discount && totals.discount > 0 ? [row(words.discount(this.#discount.code), `−${money.format(totals.discount)}`, "order-totals-discount")] : []),
      row(words.shipping, shipping === null ? later(words.shippingLater) : money.format(shipping)),
      row(words.tax, tax === null ? later(words.taxLater) : money.format(tax)),
      row(words.total, money.format(totals.total), "order-totals-total"),
    )
    section.append(totalsList)
    this.replaceChildren(section)
  }

  /** A stepper's change: the sums again, without drawing the steppers (and their focus) anew. */
  #paintTotals() {
    const money = this.#money()
    const totals = this.#totals()
    for (const line of this.#lines) {
      const amount = this.querySelector(`[data-line="${CSS.escape(line.id)}"] .order-line-amount`)
      if (amount) amount.textContent = money.format(line.price * line.quantity)
    }
    const values = this.querySelectorAll(".order-totals dd")
    if (values[0]) values[0].textContent = money.format(totals.subtotal)
    const total = this.querySelector(".order-totals-total dd")
    if (total) total.textContent = money.format(totals.total)
    if (this.#discount && totals.discount > 0) {
      const off = this.querySelector(".order-totals-discount dd")
      if (off) off.textContent = `−${money.format(totals.discount)}`
    }
  }
}

/* ------------------------------------------------------------------ paying */

type UISetPaymentFieldsEvents = { valuechange: CustomEvent<{ value: PaymentValue }> }

/**
 * <uiset-payment-fields>: `value` is the payment, `methods` the ways to pay (card and bank by
 * default). `check()` shows what's missing, puts focus on the first, and says whether it can
 * be sent.
 */
class UISetPaymentFields extends Evented<UISetPaymentFieldsEvents>() {
  #value: PaymentValue = emptyPayment()
  #methods: PaymentMethod[] | null = null
  #errors: Partial<Record<PaymentFieldName, string>> = {}
  messages?: Partial<PaymentMessages>
  maskMessages?: Partial<MaskMessages>
  #drawnMethod: string | null = null
  #fields = new Map<PaymentFieldName, { set: (text: string) => void; show: (problem: string | null) => void; focus: () => void }>()

  get value() {
    return this.#value
  }
  set value(value: PaymentValue) {
    this.#value = { ...emptyPayment(), ...value, card: { ...emptyPayment().card, ...value?.card }, bank: { ...emptyPayment().bank, ...value?.bank } }
    this.render()
  }
  get methods(): PaymentMethod[] {
    const words = { ...paymentMessages, ...this.messages }
    return this.#methods ?? [
      { id: "card", label: words.card, description: words.cardAbout },
      { id: "bank", label: words.bank, description: words.bankAbout },
    ]
  }
  set methods(methods: PaymentMethod[]) {
    this.#methods = methods
    this.#drawnMethod = null
    this.render()
  }

  connectedCallback() {
    upgradeProperties(this, ["value", "methods", "messages", "maskMessages"])
    this.render()
  }

  /** Shows what's missing or wrong, focus on the first; true when the payment can be sent. */
  check(): boolean {
    this.#errors = checkPayment(this.#value, { ...paymentMessages, ...this.messages }, { ...maskMessages, ...this.maskMessages })
    for (const [name, field] of this.#fields) field.show(this.#errors[name] ?? null)
    const first = Object.keys(this.#errors)[0] as PaymentFieldName | undefined
    if (first) this.#fields.get(first)?.focus()
    return !first
  }

  #change(next: PaymentValue) {
    this.#value = next
    this.#errors = {}
    for (const field of this.#fields.values()) field.show(null)
    this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: next }, bubbles: true }))
    const code = this.querySelector<HTMLElement>('[data-payment-field="card.code"] uiset-masked-input')
    if (code) attr(code, "for-card", next.card.number)
  }

  render() {
    if (!this.isConnected) return
    const words = { ...paymentMessages, ...this.messages }
    const masks = { ...maskMessages, ...this.maskMessages }
    const methods = this.methods
    const method = methods.some((each) => each.id === this.#value.method) ? this.#value.method : (methods[0]?.id ?? "card")
    if (this.#drawnMethod === method && this.firstChild) {
      for (const [name, field] of this.#fields) field.set(name.startsWith("card.") ? this.#value.card[name.slice(5) as keyof PaymentValue["card"]] : this.#value.bank[name.slice(5) as keyof PaymentValue["bank"]])
      return
    }
    this.#drawnMethod = method
    this.#fields.clear()
    const root = h("div", { class: "payment-fields" })
    if (methods.length > 1) {
      const group = h(
        "ui-radio-group",
        { class: "uiset-radio-cards payment-methods", "default-value": method },
        ...methods.map((each) => {
          const card = h(
            "ui-field",
            { class: "uiset-radio-card" },
            h("ui-radio", { value: each.id }, h("ui-radio-indicator")),
            h("span", { class: "uiset-radio-card-text" }, h("ui-field-label", null, each.label), ...(each.description ? [h("ui-field-description", null, each.description)] : [])),
          )
          if (each.aside) card.append(h("span", { class: "uiset-radio-card-aside" }, each.aside))
          return card
        }),
      )
      group.addEventListener("valuechange", (event) => {
        const next = (event as CustomEvent<{ value: string | null }>).detail.value
        if (!next || next === this.#value.method) return
        this.#change({ ...this.#value, method: next })
        this.render()
      })
      root.append(h("ui-field", { class: "payment-methods-field" }, h("ui-field-label", null, words.method), group))
    }
    const panel = h("div", { class: "payment-panel" })
    const masked = (name: PaymentFieldName, label: string, mask: string, write: (text: string) => void, value: string) => {
      const el = h("uiset-masked-input", { label, mask, required: "", ...(name === "card.code" ? { "for-card": this.#value.card.number } : {}) }) as MaskedInputElement
      el.messages = masks
      el.value = value
      el.addEventListener("valuechange", (event) => write(String((event as CustomEvent<{ value: string }>).detail.value ?? "")))
      this.#fields.set(name, {
        set: (text) => {
          if (el.value !== text) el.value = text
        },
        show: (problem) => attr(el, "error", problem),
        focus: () => el.querySelector("input")?.focus(),
      })
      return h("div", { "data-payment-field": name }, el)
    }
    const plain = (name: PaymentFieldName, label: string, autocomplete: string, write: (text: string) => void, value: string) => {
      const field = textField(label, autocomplete)
      field.input.value = value
      field.input.addEventListener("input", () => write(field.input.value))
      this.#fields.set(name, {
        set: (text) => {
          if (field.input.value !== text) field.input.value = text
        },
        show: field.show,
        focus: () => field.input.focus(),
      })
      return h("div", { "data-payment-field": name }, field.root)
    }
    const card = (key: keyof PaymentValue["card"]) => (text: string) => this.#change({ ...this.#value, card: { ...this.#value.card, [key]: text } })
    const bank = (key: keyof PaymentValue["bank"]) => (text: string) => this.#change({ ...this.#value, bank: { ...this.#value.bank, [key]: text } })
    if (method === "card") {
      panel.append(
        masked("card.number", words.cardNumber, "card-number", card("number"), this.#value.card.number),
        h("div", { class: "payment-row" }, masked("card.expiry", words.expiry, "card-expiry", card("expiry"), this.#value.card.expiry), masked("card.code", words.code, "card-code", card("code"), this.#value.card.code)),
        plain("card.name", words.nameOnCard, "cc-name", card("name"), this.#value.card.name),
      )
    } else if (method === "bank") {
      panel.append(
        plain("bank.name", words.accountHolder, "name", bank("name"), this.#value.bank.name),
        masked("bank.iban", words.iban, "iban", bank("iban"), this.#value.bank.iban),
        h("p", { class: "payment-mandate" }, words.mandate),
      )
    }
    root.append(panel)
    this.replaceChildren(root)
  }
}

type UISetPayButtonEvents = { pay: CustomEvent<{ wait: (work: Promise<unknown>) => void }> }

/**
 * <uiset-pay-button currency="EUR" locale="de-DE" method="the card ending 4242">: `amount` is
 * the total. It fires `pay`; hand `event.detail.wait()` your promise and it stays busy until
 * it settles. An agent's press waits for a person (`data-agent-confirm`).
 */
class UISetPayButton extends Evented<UISetPayButtonEvents>() {
  static observedAttributes = ["currency", "locale", "method", "amount", "disabled"]
  #amount = 0
  #busy = false
  messages?: Partial<PaymentMessages>

  get amount() {
    return this.#amount
  }
  set amount(amount: number) {
    this.#amount = Number(amount) || 0
    this.render()
  }

  connectedCallback() {
    upgradeProperties(this, ["amount", "messages"])
    if (this.hasAttribute("amount")) this.#amount = Number(this.getAttribute("amount")) || 0
    this.render()
  }
  attributeChangedCallback(name: string) {
    if (name === "amount") this.#amount = Number(this.getAttribute("amount")) || 0
    this.render()
  }

  render() {
    if (!this.isConnected) return
    const words = { ...paymentMessages, ...this.messages }
    const total = moneyFormat(this.getAttribute("currency") ?? "USD", this.getAttribute("locale") ?? undefined).format(this.#amount)
    let button = this.querySelector<HTMLButtonElement>("button.pay-button")
    if (!button) {
      const made = nativeButton("", { class: "pay-button" })
      button = made.native
      button.addEventListener("click", () => {
        if (this.#busy) return
        const work: Promise<unknown>[] = []
        this.dispatchEvent(new CustomEvent("pay", { detail: { wait: (promise: Promise<unknown>) => void work.push(promise) }, bubbles: true }))
        if (!work.length) return
        this.#busy = true
        this.render()
        void Promise.allSettled(work).then(() => {
          this.#busy = false
          this.render()
        })
      })
      this.replaceChildren(made.wrap)
    }
    button.textContent = this.#busy ? words.paying : words.pay(total)
    attr(button, "data-agent-confirm", words.confirmPay(total, this.getAttribute("method") ?? words.method.toLowerCase()))
    attr(button, "aria-busy", this.#busy ? "true" : null)
    button.disabled = this.#busy || isOn(this, "disabled")
  }
}

function definePayments() {
  defineElement("uiset-order-summary", UISetOrderSummary)
  defineElement("uiset-payment-fields", UISetPaymentFields)
  defineElement("uiset-pay-button", UISetPayButton)
}

export { definePayments, UISetOrderSummary, UISetPayButton, UISetPaymentFields }
export type { UISetOrderSummaryEvents, UISetPayButtonEvents, UISetPaymentFieldsEvents, PaymentValue }
