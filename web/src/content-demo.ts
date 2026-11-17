// The Content page's own script: the table's rows, the code, a validator and a pretend upload.
import { createAgent } from "@ui-sdk/web/agent"
import type { Uploader } from "@/registry/uiset/ui/upload/queue"
import type { UISetCodeBlock, UISetCodeTabs } from "./content"
import type { InlineEditElement } from "./inline-edit"
import type { UISetSchemaForm } from "./schema-form"
import { defineForm } from "@/registry/uiset/ui/schema-form/schema"
import type { UISetUpload } from "./upload"

const invoices = [
  ["INV-001", "Acme Corp", "Paid", "$2,500.00"],
  ["INV-002", "Globex", "Pending", "$1,200.00"],
  ["INV-003", "Initech", "Overdue", "$3,750.00"],
  ["INV-004", "Umbrella", "Paid", "$950.00"],
  ["INV-005", "Hooli", "Paid", "$2,100.00"],
  ["INV-006", "Vandelay", "Pending", "$1,950.00"],
]
const body = document.querySelector("#invoices tbody")!
for (const [id, customer, status, amount] of invoices) {
  const row = document.createElement("tr")
  row.innerHTML = `<th scope="row"></th><td></td><td></td><td data-align="end"></td>`
  ;[id, customer, status, amount].forEach((text, index) => (row.children[index]!.textContent = text!))
  body.append(row)
}

const snippet = document.getElementById("snippet") as UISetCodeBlock
snippet.code = `import { UISet } from "@/components/ui/uiset"

export function App({ children }: { children: React.ReactNode }) {
  return <UISet skin="studio">{children}</UISet>
}
`

const frameworks = document.getElementById("frameworks") as UISetCodeTabs
frameworks.items = [
  { value: "html", label: "HTML", language: "html", code: `<uiset-stepper label="Setup" value="details"></uiset-stepper>` },
  { value: "vue", label: "Vue", language: "vue", code: `<uiset-stepper label="Setup" :steps="steps" v-model="step"></uiset-stepper>` },
  { value: "svelte", label: "Svelte", language: "svelte", code: `<uiset-stepper label="Setup" {steps} value={step}></uiset-stepper>` },
]

const project = document.getElementById("project") as InlineEditElement
project.validate = (text) => (text.trim() ? null : "Give the project a name.")

// Goes up in a second or two; a file with "fail" in its name fails, so Retry has something to do.
const upload: Uploader = (file, { signal, onProgress }) =>
  new Promise((resolve, reject) => {
    let done = 0
    const timer = setInterval(() => {
      done = Math.min(1, done + 0.2)
      onProgress(done)
      if (done < 1) return
      clearInterval(timer)
      if (/fail/i.test(file.name)) reject(new Error("The server said no."))
      else resolve({ url: `https://files.example/${encodeURIComponent(file.name)}` })
    }, 250)
    signal.addEventListener("abort", () => {
      clearInterval(timer)
      reject(new DOMException("Canceled", "AbortError"))
    })
  })
;(document.getElementById("files") as UISetUpload).upload = upload

// The same invite as the React gallery's: three steps and a review. The pretend server says
// one address is already in the workspace.
const invite = defineForm({
  name: "invite_teammate",
  title: "Invite a teammate",
  description: "They get an email with a link to join the workspace.",
  fields: {
    email: { kind: "email", label: "Email", required: true, placeholder: "ada@example.com" },
    name: { kind: "text", label: "Full name", max: 80 },
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
    seats: { kind: "number", label: "Seats", min: 1, max: 50, step: 1, default: 1, description: "How many people this invite admits." },
    start: { kind: "date", label: "Start date" },
    message: { kind: "textarea", label: "Message", max: 280 },
    notify: { kind: "boolean", label: "Email me when they join", display: "switch", default: true },
  },
  steps: [
    { title: "Who", fields: ["email", "name"] },
    { title: "Access", fields: ["role", "seats", "start"] },
    { title: "Message", fields: ["message", "notify"] },
  ],
})
const inviteForm = document.getElementById("invite") as UISetSchemaForm
inviteForm.labels = { submit: "Send invite" }
inviteForm.send = async (values) => {
  await new Promise((resolve) => setTimeout(resolve, 400))
  if (values.email === "ada@example.com") return { email: "Ada is already in this workspace." }
  const sent = document.getElementById("invite-sent")!
  sent.textContent = `Sent to ${values.email} as ${values.role}.`
  sent.hidden = false
}
inviteForm.form = invite

Object.assign(window, { agent: createAgent() })
