"use client"

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRegion,
  ToastTitle,
  toast,
} from "@ui-sdk/react/toast"
import type * as React from "react"

// The region with a toast layout in place. Render it once; call toast() anywhere.
function Toaster(
  props: Omit<React.ComponentProps<typeof ToastRegion>, "children" | "toaster">,
) {
  return (
    <ToastRegion toaster={toast} data-agent-hidden="" {...props}>
      {() => (
        <Toast>
          <div className="toast-text">
            <ToastTitle />
            <ToastDescription />
          </div>
          <ToastAction data-variant="solid" />
          <ToastClose aria-label="Dismiss" />
        </Toast>
      )}
    </ToastRegion>
  )
}

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRegion,
  ToastTitle,
  Toaster,
  toast,
}
export { createToaster } from "@ui-sdk/react/toast"
