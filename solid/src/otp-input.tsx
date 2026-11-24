import type { ComponentProps } from "@solidjs/web"
import { omit, Repeat } from "solid-js"
import { OTPInput as OTPInputRoot, OTPInputGroup, OTPInputSlot } from "@ui-sdk/solid/otp-input"

function OTPInput(props: ComponentProps<typeof OTPInputRoot>) {
  return (
    <OTPInputRoot {...omit(props, "children")}>
      {props.children ?? (
        <OTPInputGroup>
          <Repeat count={props.maxLength ?? 6}>{(index) => <OTPInputSlot index={index} />}</Repeat>
        </OTPInputGroup>
      )}
    </OTPInputRoot>
  )
}

export { OTPInput, OTPInputGroup, OTPInputSlot }
export { OTPInputSeparator, createOTPInputController } from "@ui-sdk/solid/otp-input"
