import { Button } from "../../src/button"
import { toast } from "../../src/toast"

// toast() shows in the <Toaster /> that toast.tsx also exports: render it once, near
// your app's root.
export default function ToastExample() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast("Project created", {
          description: "Atlas is ready to deploy.",
          action: { label: "Open", onAction: () => {} },
        })
      }
    >
      Show a toast
    </Button>
  )
}
