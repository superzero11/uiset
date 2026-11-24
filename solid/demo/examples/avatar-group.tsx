import { Avatar, AvatarFallback } from "../../src/avatar"
import { AvatarGroup } from "../../src/avatar-group"

const reviewers = [
  ["Ada Lovelace", "AL"],
  ["Grace Hopper", "GH"],
  ["Katherine Johnson", "KJ"],
  ["Hedy Lamarr", "HL"],
  ["Annie Easley", "AE"],
]

export default function AvatarGroupExample() {
  return (
    <div class="row">
      <AvatarGroup label="Reviewers" max={3}>
        {reviewers.map(([name, initials]) => (
          <Avatar role="img" aria-label={name}>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
      <span class="example-note">3 shown, 2 more</span>
    </div>
  )
}
