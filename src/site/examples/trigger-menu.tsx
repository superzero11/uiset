import { Field, FieldControl, FieldLabel } from "@/registry/uiset/ui/field"
import {
  TriggerMenu,
  TriggerMenuContent,
  TriggerMenuEmpty,
  TriggerMenuInput,
  TriggerMenuItem,
  TriggerMenuList,
  type TriggerMenuDataItem,
} from "@/registry/uiset/ui/trigger-menu"

const people = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "linus", label: "Linus Pauling" },
  { value: "margaret", label: "Margaret Hamilton" },
]

export default function TriggerMenuExample() {
  return (
    <TriggerMenu triggers={[{ char: "@", items: people }]}>
      <Field className="stack">
        <FieldLabel>Reply</FieldLabel>
        <FieldControl
          render={<TriggerMenuInput placeholder="Type @ to mention someone…" />}
        />
      </Field>
      <TriggerMenuContent>
        <TriggerMenuEmpty>No one found</TriggerMenuEmpty>
        <TriggerMenuList>
          {(state) =>
            (state.items as TriggerMenuDataItem[]).map((item) => (
              <TriggerMenuItem key={item.value} value={item.value} label={item.label}>
                {item.label}
              </TriggerMenuItem>
            ))
          }
        </TriggerMenuList>
      </TriggerMenuContent>
    </TriggerMenu>
  )
}
