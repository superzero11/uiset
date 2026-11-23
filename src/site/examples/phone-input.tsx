import { useState } from "react"
import { PhoneInput } from "@/registry/uiset/ui/phone-input"

export default function PhoneInputExample() {
  const [phone, setPhone] = useState("+14155550123")
  return (
    <div className="stack">
      <PhoneInput
        label="Phone"
        value={phone}
        onValueChange={setPhone}
        defaultCountry="US"
        preferredCountries={["US", "GB", "IN", "DE"]}
        description="We text a code to this number."
      />
      <div dir="rtl" lang="ar">
        <PhoneInput label="رقم الجوال" defaultCountry="SA" locale="ar" placeholder="05x xxx xxxx" />
      </div>
      <p className="example-note">Saved as: {phone || "nothing yet"}</p>
    </div>
  )
}
