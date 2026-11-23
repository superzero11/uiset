# Address

An address whose fields follow its country. Choose a country and the fields change to the
ones it uses, in the order it writes them and by its names for them: a ZIP code and a state
in the United States, a postcode under the town in the United Kingdom, the postal code
first in Japan, a neighborhood in Brazil. A region is a list to choose from where the
country has one, a postal code is checked against the country's shape (and, in the United
States and seven other countries, against the region it's in), and autofill fills it all.
Built on UI SDK's combobox and field.

```bash
npx shadcn@latest add @uiset/address
```

The formats come from [Google's address data](https://chromium-i18n.appspot.com/ssl-address/data)
for 252 countries and regions (licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)),
the data Chrome's autofill uses, compacted to what a form needs.

## Parts

| Part                            | What it is                                                                  |
| ------------------------------- | --------------------------------------------------------------------------- |
| `AddressFields`                 | The country, the name, and the fields that country uses, in its order       |
| `checkAddress`, `emptyAddress`  | What's missing or wrong in an address, field by field; an empty one to start from |
| `addressLayout`                 | How a country writes an address: its rows, labels, required fields, regions and postal code shape |
| `fillAddress`                   | An agent's fill, with no React in it: values by field name or label         |
| `addressCountries`, `countryName` | The countries by name in a language, flags included                       |

## Use

```tsx
import { AddressFields, checkAddress, emptyAddress } from "@/components/ui/address"

const [address, setAddress] = useState(() => emptyAddress("US"))
const [errors, setErrors] = useState({})

<AddressFields label="Delivery address" value={address} onValueChange={setAddress} errors={errors} />
<Button
  onClick={() => {
    const problems = checkAddress(address)
    setErrors(problems) // shows them under the fields, focus on the first
    if (!Object.keys(problems).length) save(address)
  }}
>
  Save address
</Button>
```

The value is one object: `{ country, name, line1, line2, district, city, region, postalCode }`.
`country` is an ISO code like `"GB"`; `region` is a region's key from its list (`"CA"` for
California, `"ON"` for Ontario) or the text typed where there's no list. Fields a country
doesn't use stay as they were and aren't checked.

- **`label`** names the address for agents and screen readers ("Delivery address",
  "Billing address"). Put a heading of your own above it.
- **`section`** is `shipping` (the default) or `billing`: the autofill section, so a browser
  fills each from the right saved address.
- **`countries`** keeps the list to the countries you ship to; **`preferredCountries`** puts
  some first.
- **`regions`** adds region lists of your own, or replaces one: `{ JP: [["13", "Tokyo"], …] }`,
  each `[key, name, postal code start?]`. Lists ship for the United States, Canada,
  Australia, India, Brazil, Mexico, Italy and Spain.
- **`errors`** shows problems from a submit, focus on the first. A postal code's shape is
  checked as focus leaves it, with what one looks like: "ZIP code should look like 95014."
- **`name`** submits each field in a form as `name.field` (`shipping.city`).
- **`messages`** has the words for other languages, the names of fields by kind included
  (`postal.zip`, `region.prefecture`, `city.post_town`).

For a phone number for delivery, put a [phone input](./forms.md#phone-input) beside it.

## Keys

| Keys              | Where                      | Does                                                  |
| ----------------- | -------------------------- | ----------------------------------------------------- |
| Typing            | the country or region      | Narrows the list; its whole name chooses it outright  |
| Down, Up, Enter   | the country or region      | Move through the list and choose (UI SDK's combobox)  |
| Escape            | the country or region list | Close it and keep what was chosen                     |

## For agents

An address is one component, named by its `label`, whose value is the whole address. Its
fields inside are the person's and hidden from agents, so a delivery and a billing address on
one page never share a field's name. An agent fills it in one step with `fill`, by field
name or label, the country first so the other names are the ones it uses:

```ts
await agent.act({
  steps: [{ ref: "Delivery address", action: "fill", args: [{ country: "Canada", name: "Ada Lovelace", address: "100 King St W", city: "Toronto", province: "Ontario", "postal code": "m5x 1a9" }] }],
})
```

A country or region by name or code, and a postal code tidied as a person's is ("M5X 1A9").
What it can't take (an unknown field, a region not in the list) or takes but is wrong (a
postal code of the wrong shape) shows under the field and comes back to the agent as the
reason. The address's items list its fields, so `query({ within: "Delivery address" })`
says what `fill` takes for its country.

## Web Components

`<uiset-address-fields>` is in [Web Components](./web-components.md#address), on the same
rules:

```html
<uiset-address-fields id="address" label="Delivery address" section="shipping" default-country="GB"></uiset-address-fields>
```

```ts
const address = document.querySelector("uiset-address-fields")!
address.preferredCountries = ["GB", "IE"]
form.addEventListener("submit", (event) => {
  event.preventDefault()
  if (address.check()) save(address.value) // check() shows the problems, focus on the first
})
```

`value` is the address (setting it fires nothing); `countries`, `preferredCountries`,
`regions` and `messages` are properties; `label`, `section`, `default-country` and `locale`
attributes. It fires `valuechange`. An agent fills it the same way.
