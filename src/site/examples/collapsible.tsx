import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/registry/uiset/ui/collapsible"

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
