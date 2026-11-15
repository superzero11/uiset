import { CopyButton } from "@/registry/uiset/ui/copy-button"

export default function CopyButtonExample() {
  return (
    <div className="row">
      <code>npx shadcn add superzero11/uiset/card</code>
      <CopyButton value="npx shadcn add superzero11/uiset/card" label="Copy command" />
    </div>
  )
}
