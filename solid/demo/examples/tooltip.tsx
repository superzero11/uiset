import { Button } from "../../src/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../src/tooltip"

export default function TooltipExample() {
  return (
    <Tooltip>
      <TooltipTrigger aria-label="Archive project" render={(props) => <Button variant="outline" {...props} />}>
        Archive
      </TooltipTrigger>
      <TooltipContent>Hidden from lists, kept for 30 days</TooltipContent>
    </Tooltip>
  )
}
