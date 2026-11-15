import type { ReactNode } from "react"
import "./shell/shell.css"

function PageHeader({
  title,
  description,
  actions,
  above,
  level = 1,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  above?: ReactNode
  level?: 1 | 2
}) {
  const Heading = level === 1 ? "h1" : "h2"
  return (
    <div className="page-header">
      {above}
      <div className="page-header-row">
        <div className="page-header-text">
          <Heading className="page-header-title">{title}</Heading>
          {description && <p className="page-header-description">{description}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </div>
  )
}

export { PageHeader }
