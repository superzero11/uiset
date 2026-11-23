import { useState } from "react"
import { TagInput } from "@/registry/uiset/ui/tag-input"

const topics = ["Accessibility", "CSS", "Design systems", "Performance", "React", "Testing", "TypeScript", "Web Components"]

export default function TagInputExample() {
  const [tags, setTags] = useState(["React", "Design systems"])
  return (
    <div className="stack">
      <TagInput
        label="Topics"
        value={tags}
        onValueChange={setTags}
        suggestions={topics}
        max={5}
        maxLength={24}
        description="Pick or type one, and separate them with commas."
        placeholder="Add a topic"
      />
      <TagInput
        label="Invite by email"
        defaultValue={["ada@example.com"]}
        delimiters={[",", ";", " "]}
        transform={(tag) => tag.toLowerCase()}
        validate={(tag) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tag) ? null : `Not an email address: ${tag}`)}
        description="Paste a list: commas, spaces or one per line."
      />
      <p className="example-note">Topics: {tags.join(", ") || "none"}</p>
    </div>
  )
}
