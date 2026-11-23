# Phone input: the plan

Planned on 2026-11-23, for the release on Wednesday 2026-11-25 if it's done by then. Roadmap:
Now, "The inputs asked for most", after the tag input. Evidence: vercel-labs/ui#863, a Phone
Input proposal with a prototype (open, no answer yet), and phone inputs among shadcn/ui's
most-asked components.

## What UI SDK has

No phone field. Combobox (a country list with search, the "Input in the Popup" shape), Field,
Input, and `@ui-sdk/core/number` for formatting and reading numbers. Nothing formats a field
as you type and keeps the caret: that part is UISet's own, written once so the input masks
(next on the roadmap) reuse it.

#863 lists what's easy to get wrong, and the field covers each:

- On a right-to-left page a number's groups reorder and a dial code reads `966+`, unless the
  number and the code are isolated as left to right.
- Formatting while typing moves the caret, and Backspace sticks on a separator.
- The value is E.164 (`+14155550123`) while the field shows the national format.
- Arabic-Indic and Persian keyboards type `٠٥١٢`.

## The field

- A country button (flag, dial code) opening a Combobox with its search in the popup: every
  country by its name in the page's language (`Intl.DisplayNames`, so no names ship), its
  code and its dial code; search by any of them. `countries` limits the list,
  `preferredCountries` puts some first.
- The number in an `Input` (`type="tel"`, `inputmode="tel"`, `autocomplete="tel"`),
  formatted as typed for the country (libphonenumber-js's `AsYouType`), the caret kept after
  the same digit, Backspace and Delete stepping over separators.
- A typed or pasted `+` and calling code chooses the country. A pasted number in any format
  is read whole.
- `value` / `defaultValue` / `onValueChange` in E.164; `country` / `defaultCountry` /
  `onCountryChange`. `name` submits E.164.
- Checks: a number that can't be one for the country says so when the field is left
  ("Not a whole number for the United States"), `required`, and `validate(value)` of your
  own; a form submit is blocked through the input's validity.
- `description`, `placeholder`, `disabled`, `readOnly`, `error`, `onBlur`, `locale`,
  `messages`, as the tag input.

## Phone data

libphonenumber-js 1.13.17, its small metadata build (`libphonenumber-js/min`, MIT): about
36 KB gzipped, the same choice as the #863 prototype and shadcn/ui's phone inputs. The
React item imports it where `PhoneInput` is used; `@uiset/web` loads it as a separate chunk
the first time a phone field connects, and the field takes digits until it's in.

## Agents

One component named by its label, its value the E.164 number and its country, with
`setValue(text, country?)` (any format) and `setCountry(name or code)`. A number that isn't
valid for the country is refused with the reason, as the tag input's are; the Combobox and
the input inside are the person's.

## Where it shows up

- React `phone-input` item: `phone-input.tsx`, `phone-input/phone.ts` (the rules, no React),
  `phone-input/phone-input.ts` (the agent primitive), `phone-input/phone-input.css`, and
  `shell/format-as-you-type.ts` (the caret-keeping formatter, shared with the masks).
- `<uiset-phone-input>` on the same primitive and rules.
- The forms kit: its page (a live example under its section), the gallery, `web/content.html`,
  `docs/forms.md`, `docs/web-components.md`, looking-for, the skills, the llms files, the
  0.7.0 changelog.
- The schema form: a `phone` kind, loaded on demand (below).

## The schema form

A `phone` kind, loaded on demand (the owner's choice, 2026-11-23): the phone input is a
dependency of the schema form, but React loads it lazily and the web element loads its rules
as a chunk, so a form without a phone field never downloads libphonenumber-js. The form's
own checks take the E.164 shape (and an agent's number in international form); submit loads
the rules to check the number for its country. The `tel` kind stays a plain field.

## Looks

The country button and the number share one field box, like the tag input's chips box: one
edge and one ring. The flag and code in the skin's type; the list as Combobox's in each skin.
Text 4.5:1, edges and focus 3:1, every skin and theme; right to left checked.

## Tests

Vitest through the bridge: formatting and the caret, Backspace and Delete over separators, a
`+` choosing the country, paste, Arabic-Indic digits, E.164 values, country search, checks
on leaving, the form value, an agent's `setValue` and `setCountry` with refusals; Web
Components the same. Each rule mutation-checked. Playwright: axe in every skin and theme,
`@engine` for right to left and the caret in a real browser. Affected specs only, until
Wednesday's run.
