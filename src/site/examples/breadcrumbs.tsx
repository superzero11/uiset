import { Breadcrumbs } from "@/registry/uiset/ui/breadcrumbs"

export default function BreadcrumbsExample() {
  return (
    <Breadcrumbs
      items={[
        { label: "Projects", href: "#projects" },
        { label: "Atlas", href: "#atlas" },
        { label: "Settings" },
      ]}
    />
  )
}
