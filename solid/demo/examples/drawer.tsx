import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "../../src/drawer"
import { Label } from "../../src/field"
import { Switch } from "../../src/switch"

export default function DrawerExample() {
  return (
    <Drawer>
      <DrawerTrigger>Open filters</DrawerTrigger>
      <DrawerBackdrop />
      <DrawerContent>
        <DrawerTitle>Filters</DrawerTitle>
        <DrawerDescription>Narrow down the projects.</DrawerDescription>
        <Label class="row">
          <Switch /> Only mine
        </Label>
        <div class="actions">
          <DrawerClose>Apply filters</DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
