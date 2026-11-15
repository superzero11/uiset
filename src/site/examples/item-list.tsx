import { Avatar, AvatarFallback } from "@/registry/uiset/ui/avatar"
import { Badge } from "@/registry/uiset/ui/badge"
import { Item, ItemList } from "@/registry/uiset/ui/item-list"

export default function ItemListExample() {
  return (
    <ItemList label="Team members">
      <Item
        media={
          <Avatar role="img" aria-label="Ada Lovelace">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
        }
        title="Ada Lovelace"
        description="ada@acme.dev"
        meta={<Badge tone="success">Owner</Badge>}
      />
      <Item
        media={
          <Avatar role="img" aria-label="Grace Hopper">
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
        }
        title="Grace Hopper"
        description="grace@acme.dev"
        meta={<Badge>Member</Badge>}
      />
    </ItemList>
  )
}
