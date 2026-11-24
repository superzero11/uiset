import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import { TokenInput as TokenInputRoot, TokenInputToken, TokenInputTokenRemove } from "@ui-sdk/solid/token-input"

// Tokens render as chips with a remove button unless you pass renderToken. The button is
// pointer-only by UI SDK's design; keyboards and screen readers remove a token with Backspace.
function TokenInput(props: ComponentProps<typeof TokenInputRoot>) {
  return (
    <TokenInputRoot
      renderToken={(token) =>
        props.renderToken ? (
          props.renderToken(token)
        ) : (
          <TokenInputToken>
            {token.label}
            <TokenInputTokenRemove />
          </TokenInputToken>
        )
      }
      {...omit(props, "renderToken")}
    />
  )
}

export { TokenInput }
export {
  TokenInputEditor,
  TokenInputToken,
  TokenInputTokenRemove,
  createTokenInputController,
  defaultCodec,
  fromText,
  toLabel,
  toText,
} from "@ui-sdk/solid/token-input"
export type {
  TextEditorAdapter,
  TextRange,
  Token,
  TokenCodec,
  TokenDeletion,
  TokenInputApi,
  TokenInputChangeOptions,
  TokenInputController,
  TokenInputEditorProps,
  TokenInputEditorState,
  TokenInputOptions,
  TokenInputPrimitive,
  TokenInputProps,
  TokenInputSubmitDetails,
  TokenInputTokenProps,
  TokenInputTokenState,
  TokenInputValue,
  TokenInputValueChangeDetails,
  TokenInputValueChangeReason,
  TokenInsert,
  UndoStackOptions,
} from "@ui-sdk/solid/token-input"
