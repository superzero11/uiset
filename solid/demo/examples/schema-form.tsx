import { createSignal, Show } from "solid-js"
import { defineForm, SchemaForm, type FormValues } from "../../src/schema-form"

const invite = defineForm({
  name: "invite_teammate",
  title: "Invite a teammate",
  description: "They get an email with a link to join the workspace.",
  fields: {
    email: { kind: "email", label: "Email", required: true, placeholder: "ada@example.com" },
    name: { kind: "text", label: "Full name", max: 80 },
    mobile: { kind: "phone", label: "Mobile", defaultCountry: "US", description: "For a text when they're added. Optional." },
    role: {
      kind: "choice",
      label: "Role",
      display: "radio",
      required: true,
      default: "editor",
      options: [
        { value: "viewer", label: "Viewer" },
        { value: "editor", label: "Editor" },
        { value: "admin", label: "Admin" },
      ],
    },
    teams: {
      kind: "tags",
      label: "Teams",
      suggestions: ["Design", "Engineering", "Marketing", "Research", "Support"],
      max: 4,
      description: "Which teams they join. Pick or type one.",
    },
    seats: { kind: "number", label: "Seats", min: 1, max: 50, step: 1, default: 1, description: "How many people this invite admits." },
    start: { kind: "date", label: "Start date" },
    message: { kind: "textarea", label: "Message", max: 280 },
    notify: { kind: "boolean", label: "Email me when they join", display: "switch", default: true },
  },
  steps: [
    { title: "Who", fields: ["email", "name", "mobile"] },
    { title: "Access", fields: ["role", "teams", "seats", "start"] },
    { title: "Message", fields: ["message", "notify"] },
  ],
})

type Invite = FormValues<typeof invite.fields>

export default function SchemaFormExample() {
  const [sent, setSent] = createSignal<Invite | null>(null)
  return (
    <div class="stack">
      <SchemaForm
        form={invite}
        confirm="Sends an invite email to the address given"
        labels={{ submit: "Send invite" }}
        doneMessage="Invite sent."
        onSubmit={async (values) => {
          await new Promise((resolve) => setTimeout(resolve, 400))
          // As a server would: one address is already in the workspace.
          if (values.email === "ada@example.com") return { email: "Ada is already in this workspace." }
          setSent(values)
        }}
      />
      <Show when={sent()}>
        {(invite) => (
          <p class="example-note">
            Sent to {invite().email} as {invite().role}.
          </p>
        )}
      </Show>
    </div>
  )
}
