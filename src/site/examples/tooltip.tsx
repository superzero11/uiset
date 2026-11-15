import { Button } from "@/registry/uiset/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/uiset/ui/tooltip"

export default function TooltipExample() {
  return (
    <Tooltip>
      <TooltipTrigger aria-label="Archive project" render={<Button variant="outline" />}>
        Archive
      </TooltipTrigger>
      <TooltipContent>Hidden from lists, kept for 30 days</TooltipContent>
    </Tooltip>
  )
}
