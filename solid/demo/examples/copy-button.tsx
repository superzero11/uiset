import { CopyButton } from "../../src/copy-button"

export default function CopyButtonExample() {
  return (
    <div class="row">
      <code>npx shadcn add @uiset/card</code>
      <CopyButton value="npx shadcn add @uiset/card" label="Copy command" />
    </div>
  )
}
