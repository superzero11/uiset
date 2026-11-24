import { Avatar, AvatarFallback } from "../../src/avatar"
import { Badge, CountBadge } from "../../src/badge"
import { Button } from "../../src/button"
import { Icon } from "../../src/shell/icons"

export default function BadgeExample() {
  return (
    <div class="stack">
      <div class="row">
        <Badge>Draft</Badge>
        <Badge tone="info">Building</Badge>
        <Badge tone="success">Ready</Badge>
        <Badge tone="warning">Queued</Badge>
        <Badge tone="danger">Failed</Badge>
      </div>
      <div class="row" style={{ "gap": "1.25rem", "padding-block-start": "0.5rem" }}>
        <CountBadge count={3}>
          <Button variant="outline" aria-label="Notifications, 3 unread">
            <Icon name="bell" />
          </Button>
        </CountBadge>
        <CountBadge count={128}>
          <Button variant="outline" aria-label="Inbox, 128 unread">
            <Icon name="inbox" />
          </Button>
        </CountBadge>
        <CountBadge count={1} dot>
          <Button variant="outline" aria-label="Settings, update available">
            <Icon name="settings" />
          </Button>
        </CountBadge>
        <CountBadge count={5} label="5 new messages">
          <Avatar role="img" aria-label="Ada Lovelace">
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
        </CountBadge>
      </div>
    </div>
  )
}
