import { Fragment, type ReactNode } from "react"
import { Toaster } from "@/registry/uiset/ui/toast"
import { exampleGroups } from "./examples"

function Example({
  name,
  parts,
  wide = false,
  children,
}: {
  name: string
  parts: string
  wide?: boolean
  children: ReactNode
}) {
  const id = `example-${name.toLowerCase().replace(/\W+/g, "-")}`
  return (
    <section className="example" data-wide={wide ? "" : undefined} aria-labelledby={id}>
      <header>
        <h3 id={id}>{name}</h3>
        <p translate="no">{parts}</p>
      </header>
      <div className="example-body">{children}</div>
    </section>
  )
}

function ComponentsGallery() {
  return (
    <div className="gallery">
      {exampleGroups.map((group) => (
        <Fragment key={group.title}>
          <h2 className="gallery-group">{group.title}</h2>
          {group.examples.map(({ slug, title, parts, wide, Component }) => (
            <Example key={slug} name={title} parts={parts} wide={wide}>
              <Component />
            </Example>
          ))}
        </Fragment>
      ))}
      <Toaster />
    </div>
  )
}

export { ComponentsGallery }
