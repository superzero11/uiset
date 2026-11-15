import { useState } from "react"
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
import { Field, FieldLabel, Input } from "@/registry/uiset/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/registry/uiset/ui/select"
import { Switch } from "@/registry/uiset/ui/switch"

function ProjectSettings() {
  const [notice, setNotice] = useState<string | null>(null)
  // The name as it reads now (a person or an agent may have changed it).
  const [name, setName] = useState("Apollo")
  const [deleted, setDeleted] = useState(false)

  if (deleted) {
    return (
      <div id="project-settings" className="project-settings project-deleted">
        <p>The project was deleted. In this demo nothing is lost.</p>
        <Button onClick={() => setDeleted(false)}>Bring it back</Button>
      </div>
    )
  }

  return (
    <div id="project-settings" className="project-settings">
      <form
        id="project-form"
        className="project-fields"
        aria-label="Project settings"
        onSubmit={(event) => {
          event.preventDefault()
          setNotice("Saved.")
        }}
      >
        <Field name="project-name">
          <FieldLabel>Project name</FieldLabel>
          <Input
            defaultValue="Apollo"
            autoComplete="off"
            spellCheck={false}
            onValueChange={(value: string) => setName(value.trim() || "this project")}
          />
        </Field>
        <div className="project-row">
          <div className="project-select">
            <Select name="visibility" defaultValue="private">
              <SelectLabel>Visibility</SelectLabel>
              <SelectTrigger />
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="project-select">
            <Select name="region" defaultValue="north-america">
              <SelectLabel>Region</SelectLabel>
              <SelectTrigger />
              <SelectContent>
                <SelectItem value="north-america">North America</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Field className="project-switch">
          <FieldLabel>Weekly digest</FieldLabel>
          <Switch name="weekly-digest" />
        </Field>
        <Field className="project-switch">
          <FieldLabel>Deploy on push</FieldLabel>
          <Switch name="deploy-on-push" defaultChecked />
        </Field>
      </form>
      <div className="project-actions">
        <Button type="submit" form="project-form">
          Save project
        </Button>
        <AlertDialog>
          <AlertDialogTrigger>Delete project</AlertDialogTrigger>
          <AlertDialogBackdrop />
          <AlertDialogContent>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its deployments, domains and settings go too. This can&rsquo;t be undone.
            </AlertDialogDescription>
            <div className="project-actions">
              <AlertDialogClose>Keep it</AlertDialogClose>
              <AlertDialogClose
                value="confirm"
                data-variant="destructive"
                data-agent-confirm={`Deletes the ${name} project with its deployments, domains and settings`}
                onClick={() => setDeleted(true)}
              >
                Delete forever
              </AlertDialogClose>
            </div>
          </AlertDialogContent>
        </AlertDialog>
        <output className="project-notice" aria-live="polite">
          {notice}
        </output>
      </div>
    </div>
  )
}

export { ProjectSettings }
