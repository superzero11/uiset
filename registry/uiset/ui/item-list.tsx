import type { ReactNode } from "react"
import "./shell/shell.css"

function ItemList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="item-list">
      {children}
    </ul>
  )
}

function Item({
  media,
  title,
  description,
  meta,
  actions,
  href,
}: {
  media?: ReactNode
  title: string
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  href?: string
}) {
  return (
    <li className="item">
      {media && <span className="item-media">{media}</span>}
      <span className="item-text">
        {href ? (
          <a href={href} className="item-title">
            {title}
          </a>
        ) : (
          <span className="item-title">{title}</span>
        )}
        {description && <span className="item-description">{description}</span>}
      </span>
      {meta && <span className="item-meta">{meta}</span>}
      {actions && <span className="item-actions">{actions}</span>}
    </li>
  )
}

export { Item, ItemList }
