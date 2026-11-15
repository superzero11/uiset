import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/uiset/ui/drawer"
import { Label } from "@/registry/uiset/ui/field"
import { Switch } from "@/registry/uiset/ui/switch"

export default function DrawerExample() {
  return (
    <Drawer>
      <DrawerTrigger>Open filters</DrawerTrigger>
      <DrawerBackdrop />
      <DrawerContent>
        <DrawerTitle>Filters</DrawerTitle>
        <DrawerDescription>Narrow down the projects.</DrawerDescription>
        <Label className="row">
          <Switch /> Only mine
        </Label>
        <div className="actions">
          <DrawerClose>Apply filters</DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
