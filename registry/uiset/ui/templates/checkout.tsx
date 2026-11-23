"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { AddressFields, checkAddress, countryName, emptyAddress, startCountry, type AddressFieldName, type AddressValue } from "../address"
import { Alert } from "../alert"
import { Checkbox } from "../checkbox"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field"
import { checkPayment, emptyPayment, OrderSummary, orderTotals, PayButton, PaymentFields, paymentMethodWords, type OrderDiscount, type OrderLine, type PaymentFieldName, type PaymentValue } from "../payments"
import { PhoneInput } from "../phone-input"
import { RadioCard, RadioGroup } from "../radio"
import { sampleApplyCode, sampleDelivery, sampleLines, samplePlaceOrder, sampleTax, type DeliveryOption } from "./checkout-sample"
import "./templates.css"

// A checkout page: contact, a delivery address that follows its country, a delivery option,
// payment with the billing address the same as delivery unless unticked, and the order with
// Pay beside it (under it on a phone). Pay checks the whole page and focuses the first
// problem; an agent can fill every field, and a person pays.

type CheckoutOrder = {
  email: string
  /** E.164, or "" for none. */
  phone: string
  delivery: AddressValue
  deliveryOption: DeliveryOption
  payment: PaymentValue
  /** The billing address, or null when it's the delivery address. */
  billing: AddressValue | null
  lines: OrderLine[]
  discount: OrderDiscount | null
  total: number
}

type CheckoutTemplateProps = {
  lines?: OrderLine[]
  deliveryOptions?: DeliveryOption[]
  currency?: string
  locale?: string
  /** The country an address starts in. The page language's region by default. */
  country?: string
  /** Only these countries, by code: where you deliver. */
  countries?: readonly string[]
  /** Applies a discount code: the discount, or why it's refused. */
  onApplyCode?: (code: string) => OrderDiscount | string | Promise<OrderDiscount | string>
  /** The tax on the goods for an address, or null until it can be worked out. */
  tax?: (address: AddressValue, goods: number) => number | null
  /** Charges and places the order: nothing when it's placed, or a message to show (a declined card). */
  onPlaceOrder?: (order: CheckoutOrder) => Promise<string | void> | string | void
  heading?: ReactNode
  /** The page's own element; pass "div" inside a page that already has a <main>. */
  contentElement?: "main" | "div"
}

const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Drops the problems of the fields that changed. */
function without<Name extends string>(errors: Partial<Record<Name, string>>, changed: (name: Name) => boolean) {
  const kept = Object.fromEntries(Object.entries(errors).filter(([name]) => !changed(name as Name))) as Partial<Record<Name, string>>
  return Object.keys(kept).length === Object.keys(errors).length ? errors : kept
}
const paymentPart = (value: PaymentValue, name: PaymentFieldName) => {
  const [group, key] = name.split(".") as ["card" | "bank", string]
  return (value[group] as Record<string, string>)[key]
}

function CheckoutTemplate({
  lines: initialLines = sampleLines,
  deliveryOptions = sampleDelivery,
  currency = "USD",
  locale = "en-US",
  country,
  countries,
  onApplyCode = sampleApplyCode,
  tax: taxFor = sampleTax,
  onPlaceOrder = samplePlaceOrder,
  heading = "Checkout",
  contentElement: Content = "main",
}: CheckoutTemplateProps) {
  const [lines, setLines] = useState(initialLines)
  const [discount, setDiscount] = useState<OrderDiscount | null>(null)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [delivery, setDelivery] = useState<AddressValue>(() => emptyAddress(startCountry(country, locale)))
  const [option, setOption] = useState(deliveryOptions[0]?.id ?? "")
  const [payment, setPayment] = useState<PaymentValue>(() => emptyPayment())
  const [sameBilling, setSameBilling] = useState(true)
  const [billing, setBilling] = useState<AddressValue>(() => emptyAddress(startCountry(country, locale)))
  const [emailError, setEmailError] = useState<string | null>(null)
  const [deliveryErrors, setDeliveryErrors] = useState<Partial<Record<AddressFieldName, string>>>({})
  const [paymentErrors, setPaymentErrors] = useState<Partial<Record<PaymentFieldName, string>>>({})
  const [billingErrors, setBillingErrors] = useState<Partial<Record<AddressFieldName, string>>>({})
  const [refused, setRefused] = useState<string | null>(null)
  const [placed, setPlaced] = useState<CheckoutOrder | null>(null)
  const [attempt, setAttempt] = useState(0)
  const form = useRef<HTMLFormElement>(null)
  const done = useRef<HTMLHeadingElement>(null)

  const money = new Intl.NumberFormat(locale, { style: "currency", currency })
  const chosen = deliveryOptions.find((each) => each.id === option) ?? deliveryOptions[0]!
  const goods = orderTotals(lines, { discount }).total
  const taxNow = taxFor(sameBilling ? delivery : billing, goods)
  const total = orderTotals(lines, { discount, shipping: chosen.price, tax: taxNow }).total

  // After Pay, focus goes to the first problem on the page, in the order the fields show; each
  // part focuses its own first, and this runs after them.
  useLayoutEffect(() => {
    if (!attempt) return
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempt])
  useLayoutEffect(() => {
    if (placed) done.current?.focus()
  }, [placed])

  const pay = async () => {
    setRefused(null)
    const emailProblem = !email.trim() ? "Email is required." : emailShape.test(email.trim()) ? null : "Enter an email address, like name@example.com."
    const problems = {
      email: emailProblem,
      delivery: checkAddress(delivery, { locale }),
      payment: checkPayment(payment),
      billing: sameBilling ? {} : checkAddress(billing, { locale }),
    }
    setEmailError(problems.email)
    setDeliveryErrors(problems.delivery)
    setPaymentErrors(problems.payment)
    setBillingErrors(problems.billing)
    if (problems.email || [problems.delivery, problems.payment, problems.billing].some((each) => Object.keys(each).length)) {
      setAttempt((count) => count + 1)
      return
    }
    const order: CheckoutOrder = { email: email.trim(), phone, delivery, deliveryOption: chosen, payment, billing: sameBilling ? null : billing, lines, discount, total }
    const result = await onPlaceOrder(order)
    if (typeof result === "string" && result) setRefused(result)
    else setPlaced(order)
  }

  if (placed) {
    return (
      <Content className="checkout">
        <section className="checkout-done" aria-labelledby="checkout-done-title">
          <h1 id="checkout-done-title" className="checkout-title" tabIndex={-1} ref={done}>
            Order placed
          </h1>
          <p>
            Thanks, {placed.delivery.name.split(" ")[0]}. A receipt for {money.format(placed.total)} is on its way to {placed.email}.
          </p>
          <p>
            {placed.deliveryOption.label} delivery, {placed.deliveryOption.description}, to {placed.delivery.line1}, {placed.delivery.city || placed.delivery.region},{" "}
            {countryName(placed.delivery.country, locale)}.
          </p>
        </section>
      </Content>
    )
  }

  return (
    <Content className="checkout">
      <h1 className="checkout-title">{heading}</h1>
      <div className="checkout-body">
        <form
          ref={form}
          className="checkout-form"
          aria-label="Checkout"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void pay()
          }}
        >
          <section className="checkout-section" aria-labelledby="checkout-contact">
            <h2 id="checkout-contact" className="checkout-section-title">
              Contact
            </h2>
            <Field invalid={emailError ? true : undefined}>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onValueChange={(next) => {
                  setEmail(next)
                  setEmailError(null)
                }}
              />
              <FieldDescription>For the receipt and delivery updates.</FieldDescription>
              {emailError && <FieldError match>{emailError}</FieldError>}
            </Field>
            <PhoneInput label="Phone (optional)" description="For delivery questions only." value={phone} onValueChange={setPhone} defaultCountry={delivery.country} locale={locale} />
          </section>

          <section className="checkout-section" aria-labelledby="checkout-delivery">
            <h2 id="checkout-delivery" className="checkout-section-title">
              Delivery address
            </h2>
            <AddressFields
              label="Delivery address"
              section="shipping"
              value={delivery}
              onValueChange={(next, { field }) => {
                setDelivery(next)
                setDeliveryErrors((errors) => without(errors, (name) => !field || name === field))
              }}
              countries={countries}
              errors={deliveryErrors}
              locale={locale}
            />
          </section>

          <section className="checkout-section" aria-labelledby="checkout-shipping">
            <h2 id="checkout-shipping" className="checkout-section-title">
              Delivery
            </h2>
            <Field className="checkout-options-field">
              <FieldLabel className="uiset-visually-hidden">Delivery option</FieldLabel>
              <RadioGroup className="uiset-radio-cards checkout-options" value={option} onValueChange={(next) => next && setOption(String(next))}>
                {deliveryOptions.map((each) => (
                  <RadioCard key={each.id} value={each.id} label={each.label} description={each.description} aside={money.format(each.price)} />
                ))}
              </RadioGroup>
            </Field>
          </section>

          <section className="checkout-section" aria-labelledby="checkout-payment">
            <h2 id="checkout-payment" className="checkout-section-title">
              Payment
            </h2>
            <PaymentFields
              value={payment}
              onValueChange={(next) => {
                setPaymentErrors((errors) => without(errors, (name) => paymentPart(next, name) !== paymentPart(payment, name) || next.method !== payment.method))
                setPayment(next)
              }}
              errors={paymentErrors}
            />
            <Field className="checkout-check">
              <Checkbox checked={sameBilling} onCheckedChange={(checked) => setSameBilling(checked === true)} />
              <FieldLabel>Billing address is the same as delivery</FieldLabel>
            </Field>
            {!sameBilling && (
              <AddressFields
                label="Billing address"
                section="billing"
                value={billing}
                onValueChange={(next, { field }) => {
                  setBilling(next)
                  setBillingErrors((errors) => without(errors, (name) => !field || name === field))
                }}
                countries={countries}
                errors={billingErrors}
                locale={locale}
              />
            )}
          </section>
        </form>

        <aside className="checkout-summary" aria-label="Your order">
          <OrderSummary
            lines={lines}
            currency={currency}
            locale={locale}
            discount={discount}
            onApplyCode={async (code) => {
              const result = await onApplyCode(code)
              if (typeof result !== "string") setDiscount(result)
              return result
            }}
            onRemoveCode={() => setDiscount(null)}
            shipping={chosen.price}
            tax={taxNow}
            messages={{ taxLater: "Calculated from your address" }}
            onQuantityChange={(id, quantity) => setLines((all) => all.map((line) => (line.id === id ? { ...line, quantity } : line)))}
          >
            {refused && (
              <Alert tone="danger" urgent>
                {refused}
              </Alert>
            )}
            <PayButton amount={total} currency={currency} locale={locale} method={paymentMethodWords(payment)} onPay={pay} />
          </OrderSummary>
        </aside>
      </div>
    </Content>
  )
}

export { CheckoutTemplate }
export type { CheckoutOrder, CheckoutTemplateProps }
