import { Field, FieldLabel, Label } from "@/registry/uiset/ui/field"
import { Radio, RadioCard, RadioGroup } from "@/registry/uiset/ui/radio"

export default function RadioExample() {
  return (
    <div className="stack radio-demo">
      <Field>
        <FieldLabel>Plan</FieldLabel>
        <RadioGroup defaultValue="pro" className="uiset-radio-cards">
          <RadioCard value="hobby" label="Hobby" description="For personal projects." aside="Free" />
          <RadioCard value="pro" label="Pro" description="Per month, for growing teams." aside="$20" />
          <RadioCard value="team" label="Team" description="Per month, for whole companies." aside="$45" />
        </RadioGroup>
      </Field>
      <RadioGroup aria-label="Billing" defaultValue="monthly" className="row">
        <Label className="row">
          <Radio value="monthly" /> Monthly
        </Label>
        <Label className="row">
          <Radio value="yearly" /> Yearly
        </Label>
      </RadioGroup>
    </div>
  )
}
