import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger as SelectTriggerRoot, SelectValue } from "@ui-sdk/solid/select"

function SelectTrigger(props: ComponentProps<typeof SelectTriggerRoot>) {
  return <SelectTriggerRoot {...omit(props, "children")}>{props.children ?? <SelectValue />}</SelectTriggerRoot>
}

export { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue }
export {
  SelectArrow,
  SelectClear,
  SelectEmpty,
  SelectGroup,
  SelectGroupLabel,
  SelectInput,
  SelectItemIcon,
  SelectItemIndicator,
  SelectItemText,
  SelectItems,
  SelectList,
  SelectSelectAll,
  SelectSeparator,
  SelectStatus,
  SelectValueIcon,
  createSelectController,
} from "@ui-sdk/solid/select"
