import { Checkbox, CheckboxGroup } from "@/registry/uiset/ui/checkbox"
import { Label } from "@/registry/uiset/ui/field"

export default function CheckboxExample() {
  return (
    <CheckboxGroup
      aria-label="Notify me about"
      defaultValue={["mentions"]}
      className="stack"
    >
      <Label className="row">
        <Checkbox value="mentions" /> Mentions
      </Label>
      <Label className="row">
        <Checkbox value="deploys" /> Deploys
      </Label>
      <Label className="row">
        <Checkbox value="billing" /> Billing
      </Label>
    </CheckboxGroup>
  )
}
