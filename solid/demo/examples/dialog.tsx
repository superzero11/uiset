import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../../src/dialog"
import { Field, FieldLabel, Input } from "../../src/field"

export default function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger>Edit profile</DialogTrigger>
      <DialogBackdrop />
      <DialogContent>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>Changes are visible to your team.</DialogDescription>
        <Field class="stack">
          <FieldLabel>Display name</FieldLabel>
          <Input defaultValue="Ada" />
        </Field>
        <div class="actions">
          <DialogClose>Close profile</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
