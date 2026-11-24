import { Avatar, AvatarFallback } from "../../src/avatar"

export default function AvatarExample() {
  return (
    <div class="row">
      <Avatar role="img" aria-label="Ada Lovelace">
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
      <Avatar role="img" aria-label="Grace Hopper">
        <AvatarFallback>GH</AvatarFallback>
      </Avatar>
    </div>
  )
}
