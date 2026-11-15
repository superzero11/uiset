import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/registry/uiset/ui/menu"

export default function MenuExample() {
  return (
    <Menu>
      <MenuTrigger>Project actions</MenuTrigger>
      <MenuContent>
        <MenuItem>Rename project</MenuItem>
        <MenuItem>Duplicate project</MenuItem>
        <MenuSeparator />
        <MenuItem destructive>Delete project…</MenuItem>
      </MenuContent>
    </Menu>
  )
}
