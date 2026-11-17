"use client"

import { Children, type ComponentProps, type ReactNode } from "react"
import { Avatar, AvatarFallback } from "./avatar"
import "./shell/shell.css"

function AvatarGroup({
  label,
  max,
  total,
  moreLabel = (count) => `${count} more`,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "aria-label"> & {
  /** Names the group for screen readers and agents, like "Reviewers". */
  label: string
  /** Show this many avatars, then a count of the rest. */
  max?: number
  /** How many there are in all, when you render only the first few. */
  total?: number
  moreLabel?: (count: number) => string
  children: ReactNode
}) {
  const avatars = Children.toArray(children)
  const shown = max === undefined ? avatars : avatars.slice(0, Math.max(0, max))
  const more = Math.max(total ?? avatars.length, avatars.length) - shown.length
  return (
    <div
      role="group"
      aria-label={label}
      className={["avatar-group", className].filter(Boolean).join(" ")}
      {...props}
    >
      {shown}
      {/* Named in words, like the avatars beside it: "+2" alone reads as "plus two". */}
      {more > 0 && (
        <Avatar className="avatar-group-more" role="img" aria-label={moreLabel(more)}>
          <AvatarFallback>+{more}</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

export { AvatarGroup }
