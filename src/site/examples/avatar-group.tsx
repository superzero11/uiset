import { Avatar, AvatarFallback } from "@/registry/uiset/ui/avatar"
import { AvatarGroup } from "@/registry/uiset/ui/avatar-group"

const reviewers = [
  ["Ada Lovelace", "AL"],
  ["Grace Hopper", "GH"],
  ["Katherine Johnson", "KJ"],
  ["Hedy Lamarr", "HL"],
  ["Annie Easley", "AE"],
]

export default function AvatarGroupExample() {
  return (
    <div className="row">
      <AvatarGroup label="Reviewers" max={3}>
        {reviewers.map(([name, initials]) => (
          <Avatar key={name} role="img" aria-label={name}>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
      <span className="example-note">3 shown, 2 more</span>
    </div>
  )
}
