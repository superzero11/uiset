import { Button } from "@/registry/uiset/ui/button"
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/registry/uiset/ui/dialog"
import { Field, FieldLabel, Input, Label } from "@/registry/uiset/ui/field"
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/registry/uiset/ui/segmented-control"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/registry/uiset/ui/select"
import { Slider } from "@/registry/uiset/ui/slider"
import { Switch } from "@/registry/uiset/ui/switch"

function Specimen() {
  return (
    <div className="specimen">
      <form
        id="device-settings"
        className="specimen-fields"
        aria-label="Living room speaker"
        onSubmit={(event) => event.preventDefault()}
      >
        <Field name="device-name">
          <FieldLabel>Device name</FieldLabel>
          <Input defaultValue="Living room" autoComplete="off" />
        </Field>

        <Select name="output" defaultValue="speakers">
          <SelectLabel>Output</SelectLabel>
          <SelectTrigger />
          <SelectContent>
            <SelectItem value="speakers">Built-in speakers</SelectItem>
            <SelectItem value="headphones">Headphones</SelectItem>
            <SelectItem value="line-out">Line out</SelectItem>
          </SelectContent>
        </Select>

        <Field>
          <FieldLabel>Volume</FieldLabel>
          <Slider name="volume" defaultValue={64} showValue />
        </Field>

        <div className="specimen-row">
          <Label htmlFor="eq">Tone</Label>
          <SegmentedControl id="eq" name="eq" defaultValue="flat">
            <SegmentedControlItem value="flat">Flat</SegmentedControlItem>
            <SegmentedControlItem value="warm">Warm</SegmentedControlItem>
            <SegmentedControlItem value="bright">Bright</SegmentedControlItem>
          </SegmentedControl>
        </div>

        <Field className="specimen-row">
          <FieldLabel>Night mode</FieldLabel>
          <Switch name="night-mode" />
        </Field>
      </form>

      <div className="specimen-actions">
        <Button type="submit" form="device-settings">
          Save changes
        </Button>
        <AlertDialog>
          <AlertDialogTrigger>Forget device</AlertDialogTrigger>
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogTitle>Forget Living room?</AlertDialogTitle>
            <AlertDialogDescription>
              It disconnects now and needs to be paired again before it plays.
            </AlertDialogDescription>
            <div className="specimen-actions">
              <AlertDialogClose>Keep it</AlertDialogClose>
              <AlertDialogClose
                value="confirm"
                data-variant="solid"
                data-agent-confirm="Forgets the Living room speaker; it must be paired again"
              >
                Forget and unpair
              </AlertDialogClose>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export { Specimen }
