import { Button } from "@/registry/uiset/ui/button"
import { toast } from "@/registry/uiset/ui/toast"

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
