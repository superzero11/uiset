import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../src/alert-dialog"

export default function AlertDialogExample() {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Remove member</AlertDialogTrigger>
      <AlertDialogBackdrop />
      <AlertDialogContent>
        <AlertDialogTitle>Remove Ada from the team?</AlertDialogTitle>
        <AlertDialogDescription>She loses access right away.</AlertDialogDescription>
        <div class="row">
          <AlertDialogClose>Keep Ada</AlertDialogClose>
          <AlertDialogClose
            value="confirm"
            data-variant="solid"
            data-agent-confirm="Removes Ada from the team"
          >
            Remove now
          </AlertDialogClose>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
