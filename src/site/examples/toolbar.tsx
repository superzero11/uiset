import { Toolbar, ToolbarButton, ToolbarSeparator } from "@/registry/uiset/ui/toolbar"

export default function ToolbarExample() {
  return (
    <Toolbar aria-label="Formatting">
      <ToolbarButton>Undo edit</ToolbarButton>
      <ToolbarButton>Redo edit</ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton>Insert link</ToolbarButton>
    </Toolbar>
  )
}
