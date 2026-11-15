"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger as SelectTriggerRoot,
  SelectValue,
} from "@ui-sdk/react/select"
import type * as React from "react"

function SelectTrigger({
  children,
  ...props
}: React.ComponentProps<typeof SelectTriggerRoot>) {
  return <SelectTriggerRoot {...props}>{children ?? <SelectValue />}</SelectTriggerRoot>
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
} from "@ui-sdk/react/select"
