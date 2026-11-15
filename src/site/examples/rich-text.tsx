import { useState } from "react"
import { Button } from "@/registry/uiset/ui/button"
import {
  fromMarkdown,
  RichTextContent,
  RichTextEditor,
  toText,
  type RichTextDocument,
} from "@/registry/uiset/ui/rich-text"

const reviewers = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "linus", label: "Linus Pauling" },
]

// A comment box: no toolbar (Markdown shortcuts and Mod+B still work), Mod+Enter posts.
export default function RichTextExample() {
  const [draft, setDraft] = useState<RichTextDocument>(() => fromMarkdown(""))
  const [posted, setPosted] = useState<RichTextDocument[]>([
    fromMarkdown("Looks good. **Ship it** once @Grace Hopper signs off."),
  ])
  const post = () => {
    if (!toText(draft).trim()) return
    setPosted((list) => [...list, draft])
    setDraft(fromMarkdown(""))
  }
  return (
    <div className="comment-box">
      <ul className="comment-list" aria-label="Comments">
        {posted.map((doc, i) => (
          <li key={i}>
            <RichTextContent value={doc} />
          </li>
        ))}
      </ul>
      <RichTextEditor
        label="Comment"
        value={draft}
        onValueChange={setDraft}
        toolbar={false}
        commands={[]}
        mentions={reviewers}
        placeholder="Add a comment… Mod+Enter posts it."
        onSubmit={post}
        className="comment-editor"
      />
      <div className="row">
        <Button onClick={post}>Post comment</Button>
      </div>
    </div>
  )
}
