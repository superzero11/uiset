import { useMemo, useState } from "react"
import { RichTextContent, RichTextEditor, toHTML, toMarkdown, fromMarkdown, type RichTextDocument } from "@/registry/uiset/ui/rich-text"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"

const team = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "linus", label: "Linus Pauling" },
  { value: "margaret", label: "Margaret Hamilton" },
]

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

function EditorDemo() {
  const [doc, setDoc] = useState<RichTextDocument>(() => fromMarkdown(notes))
  const markdown = useMemo(() => toMarkdown(doc), [doc])
  const html = useMemo(() => toHTML(doc), [doc])

  return (
    <div className="editor-demo">
      <RichTextEditor
        label="Release notes"
        value={doc}
        onValueChange={setDoc}
        placeholder="Write the release notes… Type / for blocks, @ to mention someone."
        mentions={team}
        maxLength={2000}
        className="editor-demo-editor"
      />
      <Tabs defaultValue="preview" className="editor-demo-output">
        <TabsList aria-label="Output">
          <TabsTab value="preview">Preview</TabsTab>
          <TabsTab value="markdown">Markdown</TabsTab>
          <TabsTab value="html">HTML</TabsTab>
        </TabsList>
        <TabsPanel value="preview">
          <RichTextContent value={doc} />
        </TabsPanel>
        <TabsPanel value="markdown">
          <pre className="editor-demo-source" translate="no">
            <code>{markdown}</code>
          </pre>
        </TabsPanel>
        <TabsPanel value="html">
          <pre className="editor-demo-source" translate="no">
            <code>{html.replaceAll("><", ">\n<")}</code>
          </pre>
        </TabsPanel>
      </Tabs>
    </div>
  )
}

export { EditorDemo }
