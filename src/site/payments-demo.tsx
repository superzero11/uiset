import { useState } from "react"
import {
  checkPayment,
  emptyPayment,
  OrderSummary,
  orderTotals,
  PayButton,
  PaymentFields,
  paymentMethodWords,
  type OrderDiscount,
  type OrderLine,
  type PaymentFieldName,
  type PaymentValue,
} from "@/registry/uiset/ui/payments"
import { toast } from "@/registry/uiset/ui/toast"

const goods: OrderLine[] = [
  { id: "mug", name: "Stoneware mug", detail: "Sand, 350 ml", quantity: 2, price: 18.5 },
  { id: "kettle", name: "Pour-over kettle", detail: "Matte black, 1 l", quantity: 1, price: 64.99 },
  { id: "beans", name: "Single-origin beans", detail: "Whole, 250 g", quantity: 1, price: 14 },
]

/** The Payments kit page: how to pay beside the order it pays for. */
function PaymentsDemo() {
  const [lines, setLines] = useState(goods)
  const [discount, setDiscount] = useState<OrderDiscount | null>(null)
  const [payment, setPayment] = useState<PaymentValue>(emptyPayment())
  const [errors, setErrors] = useState<Partial<Record<PaymentFieldName, string>>>({})
  const shipping = 6
  const tax = Math.round(orderTotals(lines, { discount }).total * 0.08 * 100) / 100
  const total = orderTotals(lines, { discount, shipping, tax }).total
  return (
    <div className="payments-demo">
      <div className="payments-demo-pay">
        <PaymentFields value={payment} onValueChange={(next) => (setPayment(next), setErrors({}))} errors={errors} />
        <PayButton
          amount={total}
          locale="en-US"
          method={paymentMethodWords(payment)}
          onPay={async () => {
            const problems = checkPayment(payment)
            setErrors(problems)
            if (Object.keys(problems).length) return
            await new Promise((resolve) => setTimeout(resolve, 600))
            toast("Paid. A receipt is on its way.")
          }}
        />
      </div>
      <OrderSummary
        lines={lines}
        locale="en-US"
        discount={discount}
        shipping={shipping}
        tax={tax}
        onQuantityChange={(id, quantity) => setLines((all) => all.map((line) => (line.id === id ? { ...line, quantity } : line)))}
        onApplyCode={(code) => {
          if (code.toUpperCase() !== "WELCOME10") return "That code isn't one we know. Try WELCOME10."
          const applied = { code: "WELCOME10", amount: 10 }
          setDiscount(applied)
          return applied
        }}
        onRemoveCode={() => setDiscount(null)}
      />
    </div>
  )
}

export { PaymentsDemo }
