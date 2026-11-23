import { useState } from "react"
import { AddressFields, checkAddress, countryName, emptyAddress, type AddressFieldName, type AddressValue } from "@/registry/uiset/ui/address"
import { Button } from "@/registry/uiset/ui/button"
import { toast } from "@/registry/uiset/ui/toast"

/** The Address kit page: an address whose fields follow its country, checked on Save. */
function AddressDemo() {
  const [value, setValue] = useState<AddressValue>(() => emptyAddress("US"))
  const [errors, setErrors] = useState<Partial<Record<AddressFieldName, string>>>({})
  return (
    <form
      className="address-demo"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const problems = checkAddress(value)
        setErrors(problems)
        if (!Object.keys(problems).length) toast(`Address saved, in ${countryName(value.country)}.`)
      }}
    >
      <AddressFields
        label="Delivery address"
        value={value}
        onValueChange={(next, { field }) => {
          setValue(next)
          // A field the person changes drops its problem; an agent's fill drops them all.
          if (field ? errors[field] : Object.keys(errors).length) setErrors(field ? ({ [field]: _, ...rest }) => rest : {})
        }}
        preferredCountries={["US", "CA", "GB"]}
        errors={errors}
      />
      <Button type="submit" className="address-demo-save">
        Save address
      </Button>
    </form>
  )
}

export { AddressDemo }
