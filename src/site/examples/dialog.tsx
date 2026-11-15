import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/registry/uiset/ui/dialog"
import { Field, FieldLabel, Input } from "@/registry/uiset/ui/field"

export default function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger>Edit profile</DialogTrigger>
      <DialogBackdrop />
      <DialogContent>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>Changes are visible to your team.</DialogDescription>
        <Field className="stack">
          <FieldLabel>Display name</FieldLabel>
          <Input defaultValue="Ada" />
        </Field>
        <div className="actions">
          <DialogClose>Close profile</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
