"use client"

import {
  OTPInput as OTPInputRoot,
  OTPInputGroup,
  OTPInputSlot,
} from "@ui-sdk/react/otp-input"
import type * as React from "react"

function OTPInput({ children, ...props }: React.ComponentProps<typeof OTPInputRoot>) {
  const length = props.maxLength ?? 6
  return (
    <OTPInputRoot {...props}>
      {children ?? (
        <OTPInputGroup>
          {Array.from({ length }, (_, index) => (
            <OTPInputSlot key={index} index={index} />
          ))}
        </OTPInputGroup>
      )}
    </OTPInputRoot>
  )
}

export { OTPInput, OTPInputGroup, OTPInputSlot }
export { OTPInputSeparator, createOTPInputController } from "@ui-sdk/react/otp-input"
