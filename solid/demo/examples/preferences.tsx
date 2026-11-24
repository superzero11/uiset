import { createLocalStorage, createPreference } from "@ui-sdk/core"
import { Preferences, usePreference } from "../../src/preferences"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "../../src/segmented-control"

const density = createPreference({
  values: ["comfortable", "compact"],
  defaultValue: "comfortable",
  attribute: "data-density",
  storage: createLocalStorage("uiset-demo-density"),
})

export default function PreferencesExample() {
  const preference = usePreference(density)
  return (
    <Preferences preferences={[density]}>
      <SegmentedControl
        aria-label="Density"
        value={preference().value}
        onValueChange={(next) => next && density.set(next as "comfortable" | "compact")}
      >
        <SegmentedControlItem value="comfortable">Comfortable</SegmentedControlItem>
        <SegmentedControlItem value="compact">Compact</SegmentedControlItem>
      </SegmentedControl>
      <p class="example-note">
        Saved as data-density=“{preference().value}” and kept between visits.
      </p>
    </Preferences>
  )
}
