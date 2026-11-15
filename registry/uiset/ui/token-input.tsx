"use client"

import {
  TokenInput as TokenInputRoot,
  TokenInputToken,
  TokenInputTokenRemove,
} from "@ui-sdk/react/token-input"
import type * as React from "react"

// Tokens render as chips with a remove button unless you pass renderToken. The button is
// pointer-only by UI SDK's design; keyboards and screen readers remove a token with Backspace.
function TokenInput({
  renderToken,
  ...props
}: React.ComponentProps<typeof TokenInputRoot>) {
  return (
    <TokenInputRoot
      renderToken={
        renderToken ??
        ((token) => (
          <TokenInputToken>
            {token.label}
            <TokenInputTokenRemove />
          </TokenInputToken>
        ))
      }
      {...props}
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
} from "@ui-sdk/react/token-input"
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
} from "@ui-sdk/react/token-input"
