"use client"

import { announce } from "@ui-sdk/core"
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Button } from "./button"
import { Field, FieldError, FieldLabel, Input } from "./field"
import { MaskedInput } from "./input-mask"
import { cardBrand, cardCode, cardExpiry, cardNumber, iban, maskMessages, type MaskMessages } from "./input-mask/masks"
import { NumberInput, NumberInputControl, NumberInputDecrement, NumberInputGroup, NumberInputIncrement } from "./number-input"
import { moneyFormat, orderTotals, paymentMessages, type OrderDiscount, type OrderLine, type PaymentMessages } from "./payments/order"
import { RadioCard, RadioGroup } from "./radio"
import { Icon } from "./shell/icons"
import "./shell/shell.css"
import "./payments/payments.css"

/* ------------------------------------------------------------------ the order */

type OrderSummaryProps = {
  lines: readonly OrderLine[]
  /** ISO 4217, like "USD". */
  currency?: string
  locale?: string
  /** The discount applied, from your `onApplyCode`. */
  discount?: OrderDiscount | null
  /** Applies a code: the discount, or the reason it's refused ("That code has expired."). */
  onApplyCode?: (code: string) => OrderDiscount | string | Promise<OrderDiscount | string>
  onRemoveCode?: () => void
  /** Null while it isn't known yet. */
  shipping?: number | null
  tax?: number | null
  /** Quantities change with steppers when this is given. */
  onQuantityChange?: (id: string, quantity: number) => void
  /** The heading's level, or false to leave it to your page. */
  heading?: 2 | 3 | false
  messages?: Partial<PaymentMessages>
  /** Below the totals: a PayButton, terms, a note. */
  children?: ReactNode
  className?: string
}

/** An order's lines, a discount code, and its sums in the shop's currency. */
function OrderSummary({
  lines,
  currency = "USD",
  locale,
  discount = null,
  onApplyCode,
  onRemoveCode,
  shipping = null,
  tax = null,
  onQuantityChange,
  heading = 2,
  messages: overrides,
  children,
  className,
}: OrderSummaryProps) {
  const words = { ...paymentMessages, ...overrides }
  const money = moneyFormat(currency, locale)
  const totals = orderTotals(lines, { discount, shipping, tax, decimals: money.decimals })
  const titleId = useId()
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const Heading = heading ? (`h${heading}` as const) : null

  const apply = async () => {
    const text = code.trim()
    if (!text || !onApplyCode || applying) return
    setApplying(true)
    try {
      const result = await onApplyCode(text)
      if (typeof result === "string") {
        setCodeError(result)
        announce(result)
      } else {
        setCodeError(null)
        setCode("")
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <section className={["order-summary", className].filter(Boolean).join(" ")} aria-labelledby={Heading ? titleId : undefined} aria-label={Heading ? undefined : words.summary}>
      {Heading && (
        <Heading id={titleId} className="order-summary-title">
          {words.summary}
        </Heading>
      )}
      <ul className="order-lines">
        {lines.map((line) => (
          <li key={line.id} className="order-line">
            {line.image ? <img className="order-line-image" src={line.image} alt="" width={48} height={48} /> : null}
            <div className="order-line-text">
              <span className="order-line-name">{line.name}</span>
              {line.detail && <span className="order-line-detail">{line.detail}</span>}
              {onQuantityChange ? (
                <NumberInput
                  className="order-line-quantity"
                  value={line.quantity}
                  min={1}
                  max={99}
                  step={1}
                  onValueChange={(next) => next && onQuantityChange(line.id, next)}
                >
                  <NumberInputGroup>
                    <NumberInputDecrement aria-label="Decrease" />
                    <NumberInputControl aria-label={words.quantity(line.name)} />
                    <NumberInputIncrement aria-label="Increase" />
                  </NumberInputGroup>
                </NumberInput>
              ) : (
                <span className="order-line-detail">{words.quantityShort(line.quantity)}</span>
              )}
            </div>
            <span className="order-line-amount">{money.format(line.price * line.quantity)}</span>
          </li>
        ))}
      </ul>
      {onApplyCode &&
        (discount ? (
          <p className="order-code-applied">
            <Icon name="check" />
            <span>{discount.code}</span>
            {onRemoveCode && (
              <Button variant="ghost" aria-label={words.removeCode(discount.code)} onClick={onRemoveCode}>
                <Icon name="close" />
              </Button>
            )}
          </p>
        ) : (
          <Field invalid={codeError ? true : undefined} className="order-code">
            <FieldLabel>{words.discountCode}</FieldLabel>
            <div className="order-code-row">
              <Input
                value={code}
                autoComplete="off"
                onValueChange={(next) => {
                  setCode(next)
                  if (codeError) setCodeError(null)
                }}
                onKeyDown={(event) => {
                  // Enter applies the code, without sending a form the summary sits in.
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void apply()
                  }
                }}
              />
              <Button variant="outline" onClick={() => void apply()} disabled={!code.trim() || applying} aria-busy={applying || undefined}>
                {words.apply}
              </Button>
            </div>
            {codeError && <FieldError match>{codeError}</FieldError>}
          </Field>
        ))}
      <dl className="order-totals">
        <div>
          <dt>{words.subtotal}</dt>
          <dd>{money.format(totals.subtotal)}</dd>
        </div>
        {discount && totals.discount > 0 && (
          <div className="order-totals-discount">
            <dt>{words.discount(discount.code)}</dt>
            <dd>−{money.format(totals.discount)}</dd>
          </div>
        )}
        <div>
          <dt>{words.shipping}</dt>
          <dd>{shipping === null ? <span className="order-later">{words.shippingLater}</span> : money.format(shipping)}</dd>
        </div>
        <div>
          <dt>{words.tax}</dt>
          <dd>{tax === null ? <span className="order-later">{words.taxLater}</span> : money.format(tax)}</dd>
        </div>
        <div className="order-totals-total">
          <dt>{words.total}</dt>
          <dd>{money.format(totals.total)}</dd>
        </div>
      </dl>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ paying */

type PaymentValue = {
  method: string
  card: { number: string; expiry: string; code: string; name: string }
  bank: { name: string; iban: string }
}

type PaymentFieldName = "card.number" | "card.expiry" | "card.code" | "card.name" | "bank.name" | "bank.iban"

type PaymentMethod = {
  id: string
  label: string
  description?: string
  aside?: ReactNode
  /** What the method asks for. `card` and `bank` have their own fields. */
  panel?: ReactNode
}

const emptyPayment = (method = "card"): PaymentValue => ({ method, card: { number: "", expiry: "", code: "", name: "" }, bank: { name: "", iban: "" } })

/** What's missing or wrong in a payment, field by field; empty when it can be sent. */
function checkPayment(
  value: PaymentValue,
  { messages = paymentMessages, masks = maskMessages, now }: { messages?: PaymentMessages; masks?: MaskMessages; now?: () => Date } = {},
): Partial<Record<PaymentFieldName, string>> {
  const problems: Partial<Record<PaymentFieldName, string>> = {}
  const need = (name: PaymentFieldName, text: string, label: string, check?: string | null) => {
    if (!text.trim()) problems[name] = messages.required(label)
    else if (check) problems[name] = check
  }
  if (value.method === "card") {
    const { number, expiry, code, name } = value.card
    need("card.number", number, messages.cardNumber, cardNumber().check(number, masks))
    need("card.expiry", expiry, messages.expiry, cardExpiry({ now }).check(cardExpiry().keep(expiry), masks))
    need("card.code", code, messages.code, cardCode({ brand: () => cardBrand(number) }).check(code, masks))
    need("card.name", name, messages.nameOnCard)
  } else if (value.method === "bank") {
    need("bank.name", value.bank.name, messages.accountHolder)
    need("bank.iban", value.bank.iban, messages.iban, iban().check(value.bank.iban, masks))
  }
  return problems
}

/** "the card ending 4242": what a payment pays with, for the Pay button's confirm. */
function paymentMethodWords(value: PaymentValue, messages: PaymentMessages = paymentMessages) {
  if (value.method === "card" && value.card.number.length >= 4) return messages.cardEnding(value.card.number.slice(-4))
  if (value.method === "bank" && value.bank.iban.length >= 4) return messages.bankEnding(value.bank.iban.slice(-4))
  return value.method === "card" ? messages.card.toLowerCase() : value.method
}

type PaymentFieldsProps = {
  value?: PaymentValue
  defaultValue?: PaymentValue
  onValueChange?: (value: PaymentValue) => void
  /** The ways to pay, in order. By default a card and a bank account. */
  methods?: readonly PaymentMethod[]
  /** Problems to show, from `checkPayment` on submit: focus goes to the first. */
  errors?: Partial<Record<PaymentFieldName, string>>
  messages?: Partial<PaymentMessages>
  maskMessages?: Partial<MaskMessages>
  disabled?: boolean
  className?: string
}

/** How to pay: the methods as cards to choose from, and what the chosen one asks for. */
function PaymentFields({ value, defaultValue, onValueChange, methods, errors = {}, messages: overrides, maskMessages: maskWords, disabled, className }: PaymentFieldsProps) {
  const words = { ...paymentMessages, ...overrides }
  const masks = { ...maskMessages, ...maskWords }
  const [own, setOwn] = useState<PaymentValue>(defaultValue ?? emptyPayment())
  const current = value ?? own
  const list: readonly PaymentMethod[] = methods ?? [
    { id: "card", label: words.card, description: words.cardAbout },
    { id: "bank", label: words.bank, description: words.bankAbout },
  ]
  const root = useRef<HTMLDivElement>(null)

  const change = (next: PaymentValue) => {
    if (value === undefined) setOwn(next)
    onValueChange?.(next)
  }
  const setCard = (key: keyof PaymentValue["card"], text: string) => change({ ...current, card: { ...current.card, [key]: text } })
  const setBank = (key: keyof PaymentValue["bank"], text: string) => change({ ...current, bank: { ...current.bank, [key]: text } })

  // New problems from a submit: focus goes to the first, in the order the fields show.
  useLayoutEffect(() => {
    const first = Object.keys(errors)[0]
    if (!first) return
    root.current?.querySelector<HTMLElement>(`[data-payment-field="${first}"] input`)?.focus()
  }, [errors])

  const masksNow = {
    number: cardNumber(),
    expiry: cardExpiry(),
    code: cardCode({ brand: () => cardBrand(current.card.number) }),
    iban: iban(),
  }
  const chosen = list.find((method) => method.id === current.method) ?? list[0]

  return (
    <div ref={root} className={["payment-fields", className].filter(Boolean).join(" ")}>
      {list.length > 1 && (
        <Field className="payment-methods-field">
          <FieldLabel>{words.method}</FieldLabel>
          <RadioGroup
            className="uiset-radio-cards payment-methods"
            value={current.method}
            disabled={disabled}
            onValueChange={(next) => next && change({ ...current, method: String(next) })}
          >
            {list.map((method) => (
              <RadioCard key={method.id} value={method.id} label={method.label} description={method.description} aside={method.aside} />
            ))}
          </RadioGroup>
        </Field>
      )}
      {chosen?.id === "card" && !chosen.panel && (
        <div className="payment-panel">
          <div data-payment-field="card.number">
            <MaskedInput label={words.cardNumber} mask={masksNow.number} value={current.card.number} onValueChange={(next) => setCard("number", String(next ?? ""))} error={errors["card.number"]} messages={masks} required disabled={disabled} />
          </div>
          <div className="payment-row">
            <div data-payment-field="card.expiry">
              <MaskedInput label={words.expiry} mask={masksNow.expiry} value={current.card.expiry} onValueChange={(next) => setCard("expiry", String(next ?? ""))} error={errors["card.expiry"]} messages={masks} required disabled={disabled} />
            </div>
            <div data-payment-field="card.code">
              <MaskedInput label={words.code} mask={masksNow.code} value={current.card.code} onValueChange={(next) => setCard("code", String(next ?? ""))} error={errors["card.code"]} messages={masks} required disabled={disabled} />
            </div>
          </div>
          <div data-payment-field="card.name">
            <Field invalid={errors["card.name"] ? true : undefined} disabled={disabled}>
              <FieldLabel>{words.nameOnCard}</FieldLabel>
              <Input value={current.card.name} autoComplete="cc-name" required onValueChange={(next) => setCard("name", next)} />
              {errors["card.name"] && <FieldError match>{errors["card.name"]}</FieldError>}
            </Field>
          </div>
        </div>
      )}
      {chosen?.id === "bank" && !chosen.panel && (
        <div className="payment-panel">
          <div data-payment-field="bank.name">
            <Field invalid={errors["bank.name"] ? true : undefined} disabled={disabled}>
              <FieldLabel>{words.accountHolder}</FieldLabel>
              <Input value={current.bank.name} autoComplete="name" required onValueChange={(next) => setBank("name", next)} />
              {errors["bank.name"] && <FieldError match>{errors["bank.name"]}</FieldError>}
            </Field>
          </div>
          <div data-payment-field="bank.iban">
            <MaskedInput label={words.iban} mask={masksNow.iban} value={current.bank.iban} onValueChange={(next) => setBank("iban", String(next ?? ""))} error={errors["bank.iban"]} messages={masks} required disabled={disabled} />
          </div>
          <p className="payment-mandate">{words.mandate}</p>
        </div>
      )}
      {chosen?.panel && <div className="payment-panel">{chosen.panel}</div>}
    </div>
  )
}

type PayButtonProps = {
  /** The total to pay. */
  amount: number
  currency?: string
  locale?: string
  /** What it pays with, for the person an agent asks: "the card ending 4242". */
  method?: string
  /** Pays. While it runs the button is busy; throw to stop. */
  onPay: () => void | Promise<void>
  disabled?: boolean
  messages?: Partial<PaymentMessages>
  className?: string
}

/** "Pay $1,234.50". An agent's press waits for a person, who's told what it pays and with what. */
function PayButton({ amount, currency = "USD", locale, method, onPay, disabled, messages: overrides, className }: PayButtonProps) {
  const words = { ...paymentMessages, ...overrides }
  const money = moneyFormat(currency, locale)
  const [busy, setBusy] = useState(false)
  const total = money.format(amount)
  return (
    <Button
      className={["pay-button", className].filter(Boolean).join(" ")}
      data-agent-confirm={words.confirmPay(total, method ?? words.method.toLowerCase())}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true)
        try {
          await onPay()
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? words.paying : words.pay(total)}
    </Button>
  )
}

export { checkPayment, emptyPayment, OrderSummary, PayButton, PaymentFields, paymentMethodWords }
export { moneyFormat, orderTotals, paymentMessages } from "./payments/order"
export type { OrderDiscount, OrderLine, OrderTotals, PaymentMessages } from "./payments/order"
export type { OrderSummaryProps, PayButtonProps, PaymentFieldName, PaymentFieldsProps, PaymentMethod, PaymentValue }
