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
// Not data-agent-hidden: an agent reads the toast it caused and presses its Undo, and an
// empty region already stays out of the snapshot (vercel-labs/ui#978).
function Toaster(
  props: Omit<React.ComponentProps<typeof ToastRegion>, "children" | "toaster">,
) {
  return (
    <ToastRegion toaster={toast} {...props}>
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
