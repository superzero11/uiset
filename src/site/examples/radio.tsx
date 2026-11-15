import { Label } from "@/registry/uiset/ui/field"
import { Radio, RadioGroup } from "@/registry/uiset/ui/radio"

export default function RadioExample() {
  return (
    <RadioGroup aria-label="Plan" defaultValue="pro" className="stack">
      <Label className="row">
        <Radio value="hobby" /> Hobby
      </Label>
      <Label className="row">
        <Radio value="pro" /> Pro
      </Label>
      <Label className="row">
        <Radio value="team" /> Team
      </Label>
    </RadioGroup>
  )
}
