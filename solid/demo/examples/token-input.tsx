import { TokenInput, TokenInputEditor } from "../../src/token-input"

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
