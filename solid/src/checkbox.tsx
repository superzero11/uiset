import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import { Checkbox as CheckboxRoot, CheckboxIndicator } from "@ui-sdk/solid/checkbox"

function Checkbox(props: ComponentProps<typeof CheckboxRoot>) {
  return <CheckboxRoot {...omit(props, "children")}>{props.children ?? <CheckboxIndicator />}</CheckboxRoot>
}

export { Checkbox, CheckboxIndicator }
export { CheckboxGroup, createCheckboxController, createCheckboxGroupController } from "@ui-sdk/solid/checkbox"
