import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import { Switch as SwitchRoot, SwitchThumb } from "@ui-sdk/solid/switch"

function Switch(props: ComponentProps<typeof SwitchRoot>) {
  return <SwitchRoot {...omit(props, "children")}>{props.children ?? <SwitchThumb />}</SwitchRoot>
}

export { Switch, SwitchThumb }
export { createSwitchController } from "@ui-sdk/solid/switch"
