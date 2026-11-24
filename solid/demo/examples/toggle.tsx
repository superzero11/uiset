import { Toggle, ToggleGroup } from "../../src/toggle"

export default function ToggleExample() {
  return (
    <ToggleGroup aria-label="Text style" multiple defaultValue={["bold"]}>
      <Toggle value="bold">Bold</Toggle>
      <Toggle value="italic">Italic</Toggle>
      <Toggle value="underline">Underline</Toggle>
    </ToggleGroup>
  )
}
