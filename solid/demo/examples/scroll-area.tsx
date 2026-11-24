import { ScrollBox } from "../../src/scroll-area"

export default function ScrollAreaExample() {
  return (
    <ScrollBox class="scroll-demo" aria-label="Changelog">
      {Array.from({ length: 12 }, (_, i) => (
        <p>Version 2.{12 - i}: fixes and improvements.</p>
      ))}
    </ScrollBox>
  )
}
