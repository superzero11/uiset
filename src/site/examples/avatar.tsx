import { Avatar, AvatarFallback } from "@/registry/uiset/ui/avatar"

export default function AvatarExample() {
  return (
    <div className="row">
      <Avatar role="img" aria-label="Ada Lovelace">
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
      <Avatar role="img" aria-label="Grace Hopper">
        <AvatarFallback>GH</AvatarFallback>
      </Avatar>
    </div>
  )
}
