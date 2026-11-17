import { CopyButton } from "@/registry/uiset/ui/copy-button"

export default function CopyButtonExample() {
  return (
    <div className="row">
      <code>npx shadcn add @uiset/card</code>
      <CopyButton value="npx shadcn add @uiset/card" label="Copy command" />
    </div>
  )
}
