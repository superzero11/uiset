# Payments

How to pay, and what it pays for. `PaymentFields` offers the ways to pay as cards to choose
from and asks for what the chosen one needs: a card (its security code following the card's
brand) or a bank account by IBAN, with the mandate's words. `OrderSummary` lists the order's
lines, takes a discount code, and adds up the subtotal, discount, shipping, tax and total in
the shop's currency. `PayButton` says the amount, and when an agent presses it a person is
asked first. Built on the [input masks](./forms.md#input-mask) and UI SDK's radio group and
number input.

```bash
npx shadcn@latest add @uiset/payments
```

## Parts

| Part                         | What it is                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `PaymentFields`              | The methods as radio cards, and the chosen method's fields                   |
| `OrderSummary`               | Lines, a discount code, and the sums in the shop's currency                  |
| `PayButton`                  | "Pay $106.49", busy while it pays, confirmed by a person when an agent presses it |
| `checkPayment`, `emptyPayment` | What's missing in a payment, field by field; an empty one to start from   |
| `paymentMethodWords`         | "the card ending 4242", for the Pay button's question                        |
| `orderTotals`, `moneyFormat` | The sums with no React in them, in whole minor units; money in a locale      |

## Use

```tsx
import { checkPayment, emptyPayment, OrderSummary, orderTotals, PayButton, PaymentFields, paymentMethodWords } from "@/components/ui/payments"

const [payment, setPayment] = useState(emptyPayment())
const [errors, setErrors] = useState({})
const total = orderTotals(lines, { discount, shipping, tax }).total

<PaymentFields value={payment} onValueChange={setPayment} errors={errors} />
<PayButton
  amount={total}
  method={paymentMethodWords(payment)}
  onPay={async () => {
    const problems = checkPayment(payment)
    setErrors(problems) // shown under each field, focus on the first
    if (Object.keys(problems).length) return
    await charge(payment)
  }}
/>
<OrderSummary
  lines={lines}
  currency="EUR"
  locale="de-DE"
  discount={discount}
  shipping={6}
  tax={7.65}
  onApplyCode={async (code) => (await redeem(code)) ?? "That code has expired."}
  onRemoveCode={() => setDiscount(null)}
  onQuantityChange={(id, quantity) => update(id, quantity)}
/>
```

- **The payment** is one value: `{ method, card: { number, expiry, code, name }, bank: { name,
  iban } }`. The card number and code have no gaps, the expiry is `MM/YY`, the IBAN has no
  spaces. `methods` sets the ways to pay and their order (`card`, `bank`, or your own with a
  `panel` of fields); one method shows no choice.
- **Checking** is yours to start, usually on Pay: `checkPayment` says what's missing or
  wrong, field by field, with each field's own check (a card's length and Luhn check, a past
  expiry, the code's length for the brand, an IBAN's country and checksum). Pass the result
  as `errors`: each shows under its field, and focus goes to the first. Each field also
  checks itself when it's left.
- **The order's lines** are `{ id, name, detail?, quantity, price, image? }`, prices in the
  currency's main unit. `orderTotals` adds them in whole cents, so 3 × $0.10 is $0.30. A
  discount stops at the subtotal; `shipping` or `tax` left `null` reads "Calculated at the
  next step". With `onQuantityChange` each line has a stepper.
- **A discount code** goes to `onApplyCode`, which returns the discount or the reason it's
  refused; the reason shows under the field and is read out. Enter in the field applies it
  without sending a form around it.
- `messages` translates everything they say (with `maskMessages` for the card and IBAN
  fields). Money follows `currency` and `locale` through `Intl`.

## Keys

| Keys                 | Where                 | Does                                              |
| -------------------- | --------------------- | ------------------------------------------------- |
| Arrows               | the payment methods   | Choose another method (UI SDK's radio group)      |
| Enter                | the discount code     | Apply it                                          |
| Up, Down             | a line's quantity     | One more or one fewer (UI SDK's number input)     |
| Backspace, Delete    | a card or IBAN field  | Remove the character before or after, across gaps |

## For agents

- The methods are a radio group named "Payment method"; each field is listed by its label
  (the card number and security code are secret: an agent fills them but reads "[redacted]").
- The discount code is a text field and an Apply button; quantities are number inputs named
  "Quantity of Stoneware mug".
- **Pay** carries `data-agent-confirm` with what it pays and with what ("Pays $106.49 with the
  card ending 4242"): an agent can fill everything, and a person pays.

## Web Components

`<uiset-payment-fields>`, `<uiset-order-summary>` and `<uiset-pay-button>` are in
[Web Components](./web-components.md#payments), on the same masks and sums:

```html
<uiset-payment-fields id="payment"></uiset-payment-fields>
<uiset-order-summary id="order" currency="EUR" locale="de-DE" shipping="6"></uiset-order-summary>
<uiset-pay-button id="pay" currency="EUR" locale="de-DE"></uiset-pay-button>
```

```ts
const order = document.querySelector("uiset-order-summary")!
order.lines = [{ id: "mug", name: "Stoneware mug", quantity: 2, price: 18.5 }]
order.applyCode = async (code) => (await redeem(code)) ?? "That code has expired."
const payment = document.querySelector("uiset-payment-fields")!
const pay = document.querySelector("uiset-pay-button")!
pay.amount = order.total
pay.addEventListener("pay", async () => {
  if (!payment.check()) return // shows the problems, focus on the first
  await charge(payment.value)
})
```

- `<uiset-payment-fields>`: `value` is the payment, `methods` the ways to pay; `check()` shows
  what's missing and says whether it can be sent; `valuechange` fires as it's filled.
- `<uiset-order-summary>`: `lines`, `discount`, `applyCode` and `messages` are properties;
  `currency`, `locale`, `shipping`, `tax` and `quantities` (steppers) are attributes. `total`
  reads the sum; `quantitychange` and `discountchange` fire. What you put inside it (a Pay
  button, a note) stays below the totals, as React's children do.
- `<uiset-pay-button>`: `amount` and `method`; it fires `pay` and is busy until the promise
  you hand to `event.detail.wait()` settles.
