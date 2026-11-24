import { createSignal } from "solid-js"
import { cardBrand, cardCode, cardExpiry, cardNumber, currency, iban, MaskedInput, pattern, type MaskedValue } from "../../src/input-mask"

export default function InputMaskExample() {
  const [card, setCard] = createSignal<MaskedValue>("")
  const [amount, setAmount] = createSignal<MaskedValue>(1234.5)
  // The security code's length follows the card's brand: four digits for American Express.
  // Its brand is read as the code is checked, so the one mask follows the card.
  const code = cardCode({ brand: () => cardBrand(String(card() ?? "")) })
  return (
    <div class="stack">
      <MaskedInput label="Card number" mask={cardNumber()} value={card()} onValueChange={(next) => setCard(next)} />
      <div class="row" style={{ gap: "0.75rem", "align-items": "start" }}>
        <MaskedInput label="Expiry" mask={cardExpiry()} />
        <MaskedInput label="Security code" mask={code} />
      </div>
      <MaskedInput label="IBAN" mask={iban()} description="For refunds." />
      <MaskedInput label="Amount" mask={currency({ currency: "EUR", locale: "de-DE" })} value={amount()} onValueChange={(next) => setAmount(next)} />
      <MaskedInput label="Tax ID" mask={pattern("99-9999999")} />
      <p class="example-note">Amount: {amount() ?? "none"}</p>
    </div>
  )
}
