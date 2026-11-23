import { useMemo, useState } from "react"
import { cardBrand, cardCode, cardExpiry, cardNumber, currency, iban, MaskedInput, pattern, type MaskedValue } from "@/registry/uiset/ui/input-mask"

export default function InputMaskExample() {
  const [card, setCard] = useState<MaskedValue>("")
  const [amount, setAmount] = useState<MaskedValue>(1234.5)
  const number = useMemo(() => cardNumber(), [])
  const expiry = useMemo(() => cardExpiry(), [])
  // The security code's length follows the card's brand: four digits for American Express.
  const code = useMemo(() => cardCode({ brand: () => cardBrand(String(card ?? "")) }), [card])
  return (
    <div className="stack">
      <MaskedInput label="Card number" mask={number} value={card} onValueChange={setCard} />
      <div className="row" style={{ gap: "0.75rem", alignItems: "start" }}>
        <MaskedInput label="Expiry" mask={expiry} />
        <MaskedInput label="Security code" mask={code} />
      </div>
      <MaskedInput label="IBAN" mask={useMemo(() => iban(), [])} description="For refunds." />
      <MaskedInput label="Amount" mask={useMemo(() => currency({ currency: "EUR", locale: "de-DE" }), [])} value={amount} onValueChange={setAmount} />
      <MaskedInput label="Tax ID" mask={useMemo(() => pattern("99-9999999"), [])} />
      <p className="example-note">Amount: {amount ?? "none"}</p>
    </div>
  )
}
