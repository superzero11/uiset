import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core"

/** Why the value changed: typed, pasted, or set by an agent or code. */
type MaskedInputReason = "type" | "paste" | "set"

type MaskedInputOptions = {
  /** What the field reports, as text: "4242424242424242", "04/27", "1234.5". */
  value?: string
  defaultValue?: string
  /** Web Components: reports a change `set` makes (the `valuechange` event); React keeps its own. */
  onValueChange?: (value: string, details: ChangeDetails<MaskedInputReason>) => void
  /** Asks for text in any format; returns why it's refused, or nothing once it's in. */
  request?: (text: string) => string | null | undefined
  disabled?: boolean
  // Read by the Web Components element as properties; React takes them as props.
  validate?: (value: string) => string | null | undefined
  messages?: object
}

// A masked field as an agent sees it: one component named by its label, whose value is what
// the field reports. The input inside is the person's and is hidden from agents. setValue
// takes text in any format and goes through the mask and its checks; a refusal fails the step
// with the reason. A card number or code is marked data-agent-secret by the part.
/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const maskedInput = definePrimitive({
  name: "masked-input",
  options: {
    value: "string",
    defaultValue: "string",
    onValueChange: "callback",
    request: "action",
    disabled: "boolean",
    validate: "value",
    messages: "value",
  },
  controlled: ["value"],
  state: (options: MaskedInputOptions) => ({ value: options.value ?? options.defaultValue ?? "", disabled: options.disabled ?? false }),
  sync: (options) => ({ ...(options.value === undefined ? {} : { value: options.value }), disabled: options.disabled ?? false }),
  api: (context) => {
    const change = createChange(context)
    return {
      /** A change the mask already passed, as a person made it: reported, and refusable on the web. */
      set: (value: string, details: { reason: MaskedInputReason; event?: Event }) => change("value", value, details),
      /** Text in any format: "4242 4242 4242 4242", "12/2027", "€1,234.50". */
      setValue: (text: string) => {
        if (context.store.get().disabled) throw new Error("It's disabled, so it can't change.")
        const problem = context.options().request?.(String(text ?? ""))
        if (problem) throw new Error(problem)
        return true
      },
    }
  },
  slots: (slot) => ({
    root: slot<{}, { value: string; disabled: boolean }>({
      role: "group",
      state: (state) => ({ value: state.value, disabled: state.disabled }),
      attrs: (state) => ({ "data-disabled": state.disabled ? "" : undefined }),
    }),
  }),
  agent: { actions: ["setValue"] },
})

export { maskedInput }
export type { MaskedInputOptions, MaskedInputReason }
