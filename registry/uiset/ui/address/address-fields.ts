import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core"
import type { AddressValue } from "./address"

type AddressField = { value: string; label: string }

/** Why the address changed: a person's edit, an agent's fill, or code. */
type AddressFieldsReason = "input" | "fill" | "imperative"

type AddressFieldsOptions = {
  value?: AddressValue
  defaultValue?: AddressValue
  /** Web Components: reports a change `set` makes (the `valuechange` event); React keeps its own. */
  onValueChange?: (value: AddressValue, details: ChangeDetails<AddressFieldsReason>) => void
  /** Fills fields by name or label; returns the labels filled, or throws what was refused. */
  request?: (entries: Record<string, unknown>) => string[]
  /** The fields the country shows, for an agent: `{ value: "postalCode", label: "ZIP code" }`. A function reads them when asked. */
  fields?: readonly AddressField[] | (() => readonly AddressField[])
  disabled?: boolean
}

// An address as an agent sees it: one component named by its label ("Delivery address"), whose
// value is the whole address. Its fields inside are the person's and are hidden from agents,
// so two addresses on a page (delivery and billing) never share a field's name. `fill` asks the
// React or web part, which keeps the rules, and a refusal fails the step with the reason.
/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const addressFields = definePrimitive({
  name: "address-fields",
  options: {
    value: "value",
    defaultValue: "value",
    onValueChange: "callback",
    request: "action",
    fields: "value",
    disabled: "boolean",
  },
  controlled: ["value"],
  state: (options: AddressFieldsOptions) => ({
    value: options.value ?? options.defaultValue ?? null,
    disabled: options.disabled ?? false,
  }),
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    disabled: options.disabled ?? false,
  }),
  api: (context) => {
    const change = createChange(context)
    return {
      /** A change the rules already passed, as a person made it: reported, and refusable on the web. */
      set: (value: AddressValue, details: { reason: AddressFieldsReason; event?: Event }) => change("value", value, details),
      /** Web Components: the address a page set, held with no change to report, as a native input's value is. */
      hold: (value: AddressValue) => context.store.set({ value }),
      /**
       * Fills fields by name or label: `fill({ country: "Canada", city: "Toronto", "Postal code": "M5V 2T6" })`.
       * The country goes first, so the other names are the ones it uses.
       */
      fill: (entries: Record<string, unknown>) => {
        if (context.store.get().disabled) throw new Error("It's disabled, so it can't be filled.")
        if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
          throw new Error('fill takes the values by field name or label, like { country: "Canada", city: "Toronto" }.')
        }
        const request = context.options().request
        if (!request) throw new Error("It can't be filled yet.")
        return request(entries)
      },
      /** The fields, for an agent: what `fill` takes. */
      fields: (): readonly AddressField[] => {
        const fields = context.options().fields
        return typeof fields === "function" ? fields() : (fields ?? [])
      },
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: AddressValue | null; disabled: boolean }>({
      role: "group",
      state: (state) => ({ value: state.value, disabled: state.disabled }),
      attrs: (state) => ({ "data-disabled": state.disabled ? "" : undefined, "data-country": state.value?.country || undefined }),
    }),
  }),
  agent: { actions: ["fill"], items: (api) => api.fields() },
})

export { addressFields }
export type { AddressFieldsOptions, AddressFieldsReason }
