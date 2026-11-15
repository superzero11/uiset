import type { ReactNode } from "react"
import "./shell/shell.css"

type Entry = { term: ReactNode; details: ReactNode }

function DescriptionList({
  items,
  layout = "columns",
}: {
  items: Entry[]
  layout?: "columns" | "stacked"
}) {
  return (
    <dl className="description-list" data-layout={layout}>
      {items.map((item, index) => (
        <div key={index} className="description-item">
          <dt>{item.term}</dt>
          <dd>{item.details}</dd>
        </div>
      ))}
    </dl>
  )
}

export { DescriptionList }
export type { Entry as DescriptionEntry }
