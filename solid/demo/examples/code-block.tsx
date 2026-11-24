import { CodeBlock, PackageCommand } from "../../src/code-block"

const code = `import { Button } from "@/components/ui/button"

export function Save({ saving }: { saving: boolean }) {
  return <Button disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
}
`

export default function CodeBlockExample() {
  return (
    <div class="stack">
      <PackageCommand run="shadcn@latest add @uiset/code-block" />
      <CodeBlock code={code} language="tsx" title="save.tsx" lineNumbers highlight={[4]} />
    </div>
  )
}
