import { createSignal } from "solid-js"
import { Button } from "../../src/button"
import { Stepper } from "../../src/stepper"

const steps = [
  { value: "account", label: "Account" },
  { value: "details", label: "Details", description: "Name and region" },
  { value: "review", label: "Review" },
]

export default function StepperExample() {
  const [step, setStep] = createSignal("details")
  const index = () => steps.findIndex((s) => s.value === step())
  return (
    <div class="stack">
      <Stepper
        label="Setup progress"
        steps={steps}
        value={step()}
        onValueChange={setStep}
      />
      <div class="row">
        <Button
          variant="outline"
          disabled={index() === 0}
          onClick={() => setStep(steps[index() - 1]!.value)}
        >
          Back
        </Button>
        <Button
          disabled={index() === steps.length - 1}
          onClick={() => setStep(steps[index() + 1]!.value)}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
