import { useState } from "react"
import { Button } from "@/registry/uiset/ui/button"
import { Stepper } from "@/registry/uiset/ui/stepper"

const steps = [
  { value: "account", label: "Account" },
  { value: "details", label: "Details", description: "Name and region" },
  { value: "review", label: "Review" },
]

export default function StepperExample() {
  const [step, setStep] = useState("details")
  const index = steps.findIndex((s) => s.value === step)
  return (
    <div className="stack">
      <Stepper
        label="Setup progress"
        steps={steps}
        value={step}
        onValueChange={setStep}
      />
      <div className="row">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setStep(steps[index - 1]!.value)}
        >
          Back
        </Button>
        <Button
          disabled={index === steps.length - 1}
          onClick={() => setStep(steps[index + 1]!.value)}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
