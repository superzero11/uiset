import { ScrollBox } from "@/registry/uiset/ui/scroll-area"

export default function ScrollAreaExample() {
  return (
    <ScrollBox className="scroll-demo" aria-label="Changelog">
      {Array.from({ length: 12 }, (_, i) => (
        <p key={i}>Version 2.{12 - i}: fixes and improvements.</p>
      ))}
    </ScrollBox>
  )
}
