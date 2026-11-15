import { DescriptionList } from "@/registry/uiset/ui/description-list"

export default function DescriptionListExample() {
  return (
    <DescriptionList
      items={[
        { term: "Region", details: "Europe (Frankfurt)" },
        { term: "Runtime", details: "Node.js 24" },
        { term: "Domain", details: "atlas.acme.dev" },
      ]}
    />
  )
}
