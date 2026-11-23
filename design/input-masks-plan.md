# Input masks: the plan

Planned on 2026-11-23, after the tag and phone inputs. Roadmap: Now, "The inputs asked for
most", its last part. For Wednesday's release if it's done by then.

## What UI SDK has

NumberInput formats currency, percents and units with `Intl` and reads them back in the
page's locale (`@ui-sdk/core/number`), formatting when the field is left. Nothing formats a
field as it's typed. The phone input added that (`shell/format-as-you-type.ts`: the caret
stays after the same kept character, and a deleted separator takes the character beyond
it); the masks are presets on it.

## The masked input

`MaskedInput` (item `input-mask`) with a `mask`, in a Field, and `<uiset-masked-input>`:

- `cardNumber()`: digits in the card's groups (4-4-4-4, Amex 4-6-5, Diners 4-6-4), its brand
  shown in words beside the number (Visa, Mastercard, American Express, Discover, Diners
  Club, JCB, UnionPay; no logos), its length by brand, and the Luhn check.
- `cardExpiry()`: "MM / YY", a month typed as 4 becoming "04", and a date in the past or a
  thirteenth month refused.
- `cardCode({ brand })`: three digits, four for American Express.
- `iban()`: letters and digits in groups of four, upper case; the country's length and the
  mod-97 check. Lengths from Wikipedia's IBAN table (read through a summary; checked
  against example IBANs of twelve countries); SWIFT's registry is the source of truth.
- `currency({ currency, locale })`: an amount grouped as typed in the locale ("1.234,5"),
  its currency's decimals at most, the symbol beside it; the value a number.
- `pattern("999-99-9999")`: `9` a digit, `A` a letter, `*` either, anything else shown as is.

Each reports its value without separators (`"4242424242424242"`, `"DE89370400440532013000"`,
`"04/27"`, `1234.5`), checks itself when the field is left, says why in words people read,
and takes `inputMode` and `autoComplete` from the mask (`cc-number`, `cc-exp`, `cc-csc`).
`value`, `defaultValue`, `onValueChange`, `validate`, `name`, `required`, `disabled`,
`readOnly`, `placeholder`, `description`, `error`, `onBlur` and `messages`, as the phone input.

## Agents

One component named by its label, its value what the field reports, with `setValue(text)` in
any format ("4242 4242 4242 4242", "de89 3704…", "12/2027"); a refusal fails the step with
the reason. A card number and its security code are marked `data-agent-secret`: an agent can
fill them but reads "[redacted]", as UI SDK's bridge does for a secret field.

## Where it shows up

React and Web Components; the forms kit (a live section, the gallery, `web/content.html`),
docs, skills, the changelog. The schema form: a text field's `mask` (`"card-number"`,
`"card-expiry"`, `"card-code"`, `"iban"`, or a pattern), and a number field's `currency`
through NumberInput's own format.

## Tests

The rules in Vitest (each mask: typing, the caret, checks, values, other scripts' digits);
React and web through the bridge; each rule mutation-checked; axe in every skin and theme in
the browser.
