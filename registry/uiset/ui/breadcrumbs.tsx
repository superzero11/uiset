import { Icon } from "./shell/icons"
import "./shell/shell.css"

type Crumb = { label: string; href?: string }

function Breadcrumbs({
  items,
  label = "Breadcrumb",
}: {
  items: Crumb[]
  label?: string
}) {
  return (
    <nav aria-label={label} className="breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`}>
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              ) : (
                <a href={item.href}>{item.label}</a>
              )}
              {!last && <Icon name="chevron" className="breadcrumbs-separator" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Breadcrumbs }
export type { Crumb }
