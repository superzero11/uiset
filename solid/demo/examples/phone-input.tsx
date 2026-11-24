import { createSignal } from "solid-js"
import { PhoneInput } from "../../src/phone-input"

export default function PhoneInputExample() {
  const [phone, setPhone] = createSignal("+14155550123")
  return (
    <div class="stack">
      <PhoneInput
        label="Phone"
        value={phone()}
        onValueChange={(next) => setPhone(next)}
        defaultCountry="US"
        preferredCountries={["US", "GB", "IN", "DE"]}
        description="We text a code to this number."
      />
      <div dir="rtl" lang="ar">
        <PhoneInput label="رقم الجوال" defaultCountry="SA" locale="ar" placeholder="05x xxx xxxx" />
      </div>
      <p class="example-note">Saved as: {phone() || "nothing yet"}</p>
    </div>
  )
}
