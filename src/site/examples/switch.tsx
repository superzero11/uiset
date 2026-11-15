import { Label } from "@/registry/uiset/ui/field"
import { Switch } from "@/registry/uiset/ui/switch"

export default function SwitchExample() {
  return (
    <Label className="row">
      <Switch defaultChecked /> Email notifications
    </Label>
  )
}
