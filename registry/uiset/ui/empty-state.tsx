import type { ReactNode } from "react"
import { Icon, type IconName } from "./shell/icons"
import "./shell/shell.css"

function EmptyState({
  title,
  description,
  icon = "inbox",
  actions,
  level = 2,
}: {
  title: string
  description?: ReactNode
  icon?: IconName | null
  actions?: ReactNode
  level?: 2 | 3 | 4
}) {
  const Heading = `h${level}` as "h2" | "h3" | "h4"
  return (
    <div className="empty-state">
      {icon && <Icon name={icon} className="empty-state-icon" />}
      <Heading className="empty-state-title">{title}</Heading>
      {description && <p className="empty-state-description">{description}</p>}
      {actions && <div className="empty-state-actions">{actions}</div>}
    </div>
  )
}

export { EmptyState }
