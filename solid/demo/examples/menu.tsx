import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "../../src/menu"

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
