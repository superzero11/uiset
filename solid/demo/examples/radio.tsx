import { Field, FieldLabel, Label } from "../../src/field"
import { Radio, RadioCard, RadioGroup } from "../../src/radio"

export default function RadioExample() {
  return (
    <div class="stack radio-demo">
      <Field>
        <FieldLabel>Plan</FieldLabel>
        <RadioGroup defaultValue="pro" class="uiset-radio-cards">
          <RadioCard value="hobby" label="Hobby" description="For personal projects." aside="Free" />
          <RadioCard value="pro" label="Pro" description="Per month, for growing teams." aside="$20" />
          <RadioCard value="team" label="Team" description="Per month, for whole companies." aside="$45" />
        </RadioGroup>
      </Field>
      <RadioGroup aria-label="Billing" defaultValue="monthly" class="row">
        <Label class="row">
          <Radio value="monthly" /> Monthly
        </Label>
        <Label class="row">
          <Radio value="yearly" /> Yearly
        </Label>
      </RadioGroup>
    </div>
  )
}
