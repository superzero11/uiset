import { For, Show } from "solid-js"
import { Button } from "./button"
import { Icon } from "./shell/icons"
import "../../registry/uiset/ui/shell/shell.css"

type Step = { value: string; label: string; description?: string }

// Steps are buttons with aria-current="step". In a linear flow, steps ahead of the
// current one can't be chosen until it's reached.
function Stepper(props: { steps: Step[]; value: string; onValueChange: (value: string) => void; label?: string; linear?: boolean }) {
  const current = () =>
    Math.max(
      0,
      props.steps.findIndex((step) => step.value === props.value),
    )
  return (
    <nav aria-label={props.label ?? "Progress"} class="stepper">
      <ol>
        <For each={props.steps}>
          {(step, index) => {
            const state = () => (index() < current() ? "complete" : index() === current() ? "current" : "upcoming")
            return (
              <li data-state={state()}>
                <Button
                  variant="ghost"
                  class="stepper-step"
                  aria-current={state() === "current" ? "step" : undefined}
                  disabled={props.linear !== false && index() > current()}
                  onClick={() => props.onValueChange(step.value)}
                >
                  <span class="stepper-mark" aria-hidden="true">
                    {state() === "complete" ? <Icon name="check" /> : index() + 1}
                  </span>
                  <span class="stepper-text">
                    <span class="stepper-label">{step.label}</span>
                    {/* Read as "Details, Name and region", not run together. */}
                    <Show when={step.description}>
                      {(description) => (
                        <>
                          <span class="uiset-visually-hidden">, </span>
                          <span class="stepper-description">{description()}</span>
                        </>
                      )}
                    </Show>
                  </span>
                  <Show when={state() === "complete"}>
                    <span class="uiset-visually-hidden"> (done)</span>
                  </Show>
                </Button>
              </li>
            )
          }}
        </For>
      </ol>
    </nav>
  )
}

export { Stepper }
export type { Step as StepperStep }
