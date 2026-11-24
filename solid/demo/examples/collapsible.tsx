import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "../../src/collapsible"

export default function CollapsibleExample() {
  return (
    <Collapsible>
      <CollapsibleTrigger>Show advanced settings</CollapsibleTrigger>
      <CollapsiblePanel>
        Build cache, environment variables and webhooks.
      </CollapsiblePanel>
    </Collapsible>
  )
}
