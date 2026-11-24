import { createSignal, For } from "solid-js"
import { Button } from "../../src/button"
import {
  fromMarkdown,
  RichTextContent,
  RichTextEditor,
  toText,
  type RichTextDocument,
} from "../../src/rich-text"

const reviewers = [
  { value: "ada", label: "Ada Lovelace" },
  { value: "grace", label: "Grace Hopper" },
  { value: "linus", label: "Linus Pauling" },
]

// A comment box: no toolbar (Markdown shortcuts and Mod+B still work), Mod+Enter posts.
export default function RichTextExample() {
  const [draft, setDraft] = createSignal<RichTextDocument>(fromMarkdown(""))
  const [posted, setPosted] = createSignal<RichTextDocument[]>([
    fromMarkdown("Looks good. **Ship it** once @Grace Hopper signs off."),
  ])
  const post = () => {
    if (!toText(draft()).trim()) return
    setPosted((list) => [...list, draft()])
    setDraft(fromMarkdown(""))
  }
  return (
    <div class="comment-box">
      <ul class="comment-list" aria-label="Comments">
        <For each={posted()}>
          {(doc) => (
            <li>
              <RichTextContent value={doc} />
            </li>
          )}
        </For>
      </ul>
      <RichTextEditor
        label="Comment"
        value={draft()}
        onValueChange={setDraft}
        toolbar={false}
        commands={[]}
        mentions={reviewers}
        placeholder="Add a comment… Mod+Enter posts it."
        onSubmit={post}
        class="comment-editor"
      />
      <div class="row">
        <Button onClick={post}>Post comment</Button>
      </div>
    </div>
  )
}
