import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../src/hover-card"

export default function HoverCardExample() {
  return (
    <HoverCard>
      <HoverCardTrigger render={(props) => <a href="#ada" {...props} />}>@ada</HoverCardTrigger>
      <HoverCardContent>
        <p class="example-strong">Ada Lovelace</p>
        <p class="example-note">Maintainer since 2024</p>
      </HoverCardContent>
    </HoverCard>
  )
}
