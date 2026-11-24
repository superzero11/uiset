import { Toolbar, ToolbarButton, ToolbarSeparator } from "../../src/toolbar"

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
