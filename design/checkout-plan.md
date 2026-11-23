# Checkout: a payments kit, an address kit and the checkout template

Planned on 2026-11-23 (the owner: "Go with checkout template next, also maybe add a few more
kits based on newly created components like a card kit"). Roadmap: Next 8, "More templates"
(checkout first), moved to Now, with two kits built from the day's inputs.

## The payments kit (`payments`)

Built on the input masks, the phone input and UI SDK's radio group.

- **`PaymentFields`** (`payment-fields`): how to pay. Methods as radio cards (`card`, `bank`
  for SEPA direct debit, or your own with a panel of your own). Card: the number, expiry,
  security code (its length following the card's brand) and name on the card. Bank: the
  account holder and IBAN, and the mandate's words to agree to. One value
  (`{ method, card: { number, expiry, code, name }, bank: { name, iban } }`), checked as a
  whole (`check()` says what's missing, field by field, and moves focus to the first).
- **`OrderSummary`** (`order-summary`): the lines (name, a detail, quantity, price, an
  optional image), a discount code (applied by your function, which says why one is
  refused), and the subtotal, discount, shipping, tax and total in the shop's currency and
  locale. Quantities change by NumberInput when `onQuantityChange` is given. A list people
  and agents read line by line.
- **`PayButton`**: "Pay $1,234.50" in the shop's currency, busy while paying, and marked
  `data-agent-confirm` ("Pays $1,234.50 with the card ending 4242"): an agent can fill
  everything, a person pays.

## The address kit (`address`)

- **`AddressFields`** (`address-fields`): the country first (the phone input's list, by name
  in the page's language), then the fields that country uses, in its order: name, two lines,
  city, a region (a list for the United States, Canada, Australia, India, Brazil, Mexico,
  Italy and Spain; text elsewhere), and a postal code with its shape (`99999` or
  `99999-9999` in the US, `A9A 9A9` in Canada, `9999 AA` in the Netherlands, and so on),
  plus an optional phone. Autofill tokens on every field (`shipping` or `billing`). One
  value, checked as a whole. Agents fill it by field name, like a schema form.

## The checkout template (`checkout`)

A page: contact (email, and a phone for delivery), delivery address (`AddressFields`),
delivery options (radio cards with a price and a date), payment (`PaymentFields`, with
"billing address same as delivery" or a second `AddressFields`), and `OrderSummary` beside
it (below it on a phone) with `PayButton`. Sample data: a made-up shop's goods, no real
brands; the look is the skins', not any real checkout's. React and Web Components.

## Other kits the new parts could grow into (for the owner to pick)

- **A contact kit**: a contact card and its edit form (phone, email, address), and a list
  that groups people by tag (the tag input).
- **A shop kit**: product cards, a cart drawer and a mini cart, built on the order summary.
- **An invoice template** (roadmap Next 8 too): the order summary as a printable invoice,
  with IBAN details for a bank transfer.

## Tests

Each part's behavior through the agent bridge (filling, checks, the order's sums, a refused
discount, the pay confirm); axe in every skin and theme; `@engine` for the two-column page
at phone width; mutation checks on each rule.
