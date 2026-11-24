import { Field, FieldControl, FieldLabel } from "../../src/field"
import {
  TriggerMenu,
  TriggerMenuContent,
  TriggerMenuEmpty,
  TriggerMenuInput,
  TriggerMenuItem,
  TriggerMenuList,
  type TriggerMenuDataItem,
} from "../../src/trigger-menu"

const people = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "linus", label: "Linus Pauling" },
  { value: "margaret", label: "Margaret Hamilton" },
]

export default function TriggerMenuExample() {
  return (
    <TriggerMenu triggers={[{ char: "@", items: people }]}>
      <Field class="stack">
        <FieldLabel>Reply</FieldLabel>
        <FieldControl
          render={(props) => <TriggerMenuInput placeholder="Type @ to mention someone…" {...props} />}
        />
      </Field>
      <TriggerMenuContent>
        <TriggerMenuEmpty>No one found</TriggerMenuEmpty>
        <TriggerMenuList>
          {(state) =>
            (state.items as TriggerMenuDataItem[]).map((item) => (
              <TriggerMenuItem value={item.value} label={item.label}>
                {item.label}
              </TriggerMenuItem>
            ))
          }
        </TriggerMenuList>
      </TriggerMenuContent>
    </TriggerMenu>
  )
}
