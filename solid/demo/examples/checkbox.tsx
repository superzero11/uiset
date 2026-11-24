import { Checkbox, CheckboxGroup } from "../../src/checkbox"
import { Label } from "../../src/field"

export default function CheckboxExample() {
  return (
    <CheckboxGroup
      aria-label="Notify me about"
      defaultValue={["mentions"]}
      class="stack"
    >
      <Label class="row">
        <Checkbox value="mentions" /> Mentions
      </Label>
      <Label class="row">
        <Checkbox value="deploys" /> Deploys
      </Label>
      <Label class="row">
        <Checkbox value="billing" /> Billing
      </Label>
    </CheckboxGroup>
  )
}
