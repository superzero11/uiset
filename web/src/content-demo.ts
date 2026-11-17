// The Content page's own script: the table's rows, the code, a validator and a pretend upload.
import { createAgent } from "@ui-sdk/web/agent"
import type { Uploader } from "@/registry/uiset/ui/upload/queue"
import type { UISetCodeBlock, UISetCodeTabs } from "./content"
import type { InlineEditElement } from "./inline-edit"
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

Object.assign(window, { agent: createAgent() })
