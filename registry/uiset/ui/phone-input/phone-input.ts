import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core"

/** Why the number changed: typed, pasted, its country chosen, or set by an agent or code. */
type PhoneInputReason = "type" | "paste" | "country" | "set"

type PhoneInputOptions = {
  value?: string
  defaultValue?: string
  /** Web Components: reports a change `set` makes (the `valuechange` event); React keeps its own. */
  onValueChange?: (value: string, details: ChangeDetails<PhoneInputReason>) => void
  country?: string
  /** Asks for a number (any format) and, optionally, a country; returns why it's refused, or nothing. */
  request?: (text: string, country?: string) => string | null | undefined
  /** Asks for a country by name, code or calling code; returns why it's refused, or nothing. */
  requestCountry?: (query: string) => string | null | undefined
  disabled?: boolean
  // Read by the Web Components element as properties; React takes them as props.
  validate?: (value: string) => string | null | undefined
  messages?: object
  countries?: readonly string[]
  preferredCountries?: readonly string[]
}

// The phone field as an agent sees it: one component named by its label, whose value is the
// number in E.164 and whose country is its country. The country list and the number's input
// inside are the person's and are hidden from agents. Each action asks the React or web part,
// which keeps the rules, and a refusal fails the step with the reason.
/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const phoneInput = definePrimitive({
  name: "phone-input",
  options: {
    value: "string",
    defaultValue: "string",
    onValueChange: "callback",
    country: "string",
    request: "action",
    requestCountry: "action",
    disabled: "boolean",
    validate: "value",
    messages: "value",
    countries: "list",
    preferredCountries: "list",
  },
  controlled: ["value", "country"],
  state: (options: PhoneInputOptions) => ({
    value: options.value ?? options.defaultValue ?? "",
    country: options.country ?? "",
    disabled: options.disabled ?? false,
  }),
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    ...(options.country === undefined ? {} : { country: options.country }),
    disabled: options.disabled ?? false,
  }),
  api: (context) => {
    const change = createChange(context)
    const unless = (problem: string | null | undefined) => {
      if (problem) throw new Error(problem)
      return true
    }
    const usable = () => {
      if (context.store.get().disabled) throw new Error("It's disabled, so its number can't change.")
    }
    return {
      /** A change the rules already passed, as a person made it: reported, and refusable on the web. */
      set: (value: string, details: { reason: PhoneInputReason; event?: Event }) => change("value", value, details),
      /** The number, in any format ("020 7946 0958", "+44 20 7946 0958"), for `country` or the one chosen. */
      setValue: (text: string, country?: string) => {
        usable()
        return unless(context.options().request?.(String(text ?? ""), country))
      },
      /** The country, by its name, its code ("GB") or its calling code ("+44"). */
      setCountry: (query: string) => {
        usable()
        return unless(context.options().requestCountry?.(String(query ?? "")))
      },
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: string; country: string; disabled: boolean }>({
      role: "group",
      state: (state) => ({ value: state.value, country: state.country, disabled: state.disabled }),
      attrs: (state) => ({ "data-disabled": state.disabled ? "" : undefined, "data-country": state.country || undefined }),
    }),
  }),
  agent: { actions: ["setValue", "setCountry"] },
})

export { phoneInput }
export type { PhoneInputOptions, PhoneInputReason }
