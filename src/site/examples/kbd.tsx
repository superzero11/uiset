import { Kbd } from "@/registry/uiset/ui/kbd"

export default function KbdExample() {
  return (
    <p className="example-note">
      Search with <Kbd keys="mod+k" />, save with <Kbd keys="mod+s" />.
    </p>
  )
}
