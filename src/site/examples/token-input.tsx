import { TokenInput, TokenInputEditor } from "@/registry/uiset/ui/token-input"

export default function TokenInputExample() {
  return (
    <TokenInput
      defaultValue={[
        "Summarize ",
        { type: "file", value: "src/routes.ts", label: "routes.ts" },
      ]}
    >
      <TokenInputEditor aria-label="Prompt with files" />
    </TokenInput>
  )
}
