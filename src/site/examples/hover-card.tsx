import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/registry/uiset/ui/hover-card"

export default function HoverCardExample() {
  return (
    <HoverCard>
      <HoverCardTrigger render={<a href="#ada" />}>@ada</HoverCardTrigger>
      <HoverCardContent>
        <p className="example-strong">Ada Lovelace</p>
        <p className="example-note">Maintainer since 2024</p>
      </HoverCardContent>
    </HoverCard>
  )
}
