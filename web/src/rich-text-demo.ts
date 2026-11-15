// The Rich text page's own script: the gallery's release notes, the team for "@", and the
// Markdown and HTML as they change.
import { createAgent } from "@ui-sdk/web/agent"
import type { Doc } from "@/registry/uiset/ui/rich-text/model"
import { toHTML } from "@/registry/uiset/ui/rich-text/serialize"

type Editor = HTMLElement & { value: string; doc: Doc; mentions: { value: string; label: string }[] }

const notes = `## Release 2.4

Sync is now **twice as fast** on large projects, and offline edits merge without asking.

- Faster sync for projects over 10,000 files
- Offline edits merge on reconnect
  - Conflicts show both versions side by side
- A new \`--dry-run\` flag for imports

### Before we ship

- [x] Update the migration guide
- [ ] Record the demo
- [ ] Tell support about the new flag

> Upgrading from 2.2? Read the [migration guide](https://example.com/migrate) first.

\`\`\`
npm install acme@2.4
\`\`\`
`

const editor = document.getElementById("notes") as Editor
const preview = document.getElementById("preview") as HTMLElement & { doc: Doc }
const markdown = document.getElementById("markdown")!
const html = document.getElementById("html")!

editor.mentions = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "linus", label: "Linus Pauling" },
  { value: "margaret", label: "Margaret Hamilton" },
]
editor.value = notes

const show = () => {
  preview.doc = editor.doc
  markdown.textContent = editor.value
  html.textContent = toHTML(editor.doc).replaceAll("><", ">\n<")
}
show()
editor.addEventListener("valuechange", show)

Object.assign(window, { agent: createAgent() })
