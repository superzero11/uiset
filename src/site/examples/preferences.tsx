import { createLocalStorage, createPreference } from "@ui-sdk/core"
import { Preferences, usePreference } from "@/registry/uiset/ui/preferences"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/registry/uiset/ui/segmented-control"

const density = createPreference({
  values: ["comfortable", "compact"],
  defaultValue: "comfortable",
  attribute: "data-density",
  storage: createLocalStorage("uiset-demo-density"),
})

export default function PreferencesExample() {
  const { value } = usePreference(density)
  return (
    <Preferences preferences={[density]}>
      <SegmentedControl
        aria-label="Density"
        value={value}
        onValueChange={(next) => next && density.set(next as "comfortable" | "compact")}
      >
        <SegmentedControlItem value="comfortable">Comfortable</SegmentedControlItem>
        <SegmentedControlItem value="compact">Compact</SegmentedControlItem>
      </SegmentedControl>
      <p className="example-note">
        Saved as data-density=“{value}” and kept between visits.
      </p>
    </Preferences>
  )
}
