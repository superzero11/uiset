import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/registry/uiset/ui/menu"
import { Menubar } from "@/registry/uiset/ui/menubar"

export default function MenubarExample() {
  return (
    <Menubar aria-label="Editor menu">
      <Menu>
        <MenuTrigger>File</MenuTrigger>
        <MenuContent>
          <MenuItem>New file</MenuItem>
          <MenuItem>Open file…</MenuItem>
        </MenuContent>
      </Menu>
      <Menu>
        <MenuTrigger>View</MenuTrigger>
        <MenuContent>
          <MenuItem>Zoom in</MenuItem>
          <MenuItem>Zoom out</MenuItem>
        </MenuContent>
      </Menu>
    </Menubar>
  )
}
