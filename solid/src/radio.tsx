import type { ComponentProps, JSX } from "@solidjs/web"
import { omit, Show } from "solid-js"
import { Radio as RadioRoot, RadioIndicator } from "@ui-sdk/solid/radio"
import { Field, FieldDescription, FieldLabel } from "./field"
import { withClass } from "./shell/class"

function Radio(props: ComponentProps<typeof RadioRoot>) {
  return <RadioRoot {...omit(props, "children")}>{props.children ?? <RadioIndicator />}</RadioRoot>
}

// An option as a card that a press anywhere on chooses. Its radio is named by `label` alone and
// described by `description`, so a screen reader or an agent hears "Pro", not the whole card.
function RadioCard(
  props: Omit<ComponentProps<typeof Field>, "children"> & {
    value: string
    label: JSX.Element
    description?: JSX.Element
    /** Shown at the card's end, like a price. Not part of the name. */
    aside?: JSX.Element
  },
) {
  const rest = omit(props, "value", "label", "description", "aside", "class")
  return (
    <Field class={withClass("uiset-radio-card", () => props.class)} {...rest}>
      <Radio value={props.value} />
      <span class="uiset-radio-card-text">
        <FieldLabel>{props.label}</FieldLabel>
        <Show when={props.description}>{(description) => <FieldDescription>{description()}</FieldDescription>}</Show>
      </span>
      <Show when={props.aside}>{(aside) => <span class="uiset-radio-card-aside">{aside()}</span>}</Show>
    </Field>
  )
}

export { Radio, RadioCard, RadioIndicator }
export { RadioGroup, createRadioGroupController } from "@ui-sdk/solid/radio"
