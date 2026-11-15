import { useState } from "react"
import { Button } from "@/registry/uiset/ui/button"
import { DrawerTrigger } from "@/registry/uiset/ui/drawer"
import { Field, FieldLabel, Input } from "@/registry/uiset/ui/field"
import {
  ActionSheet,
  AppBar,
  PullToRefresh,
  Sheet,
  SwipeList,
  TabBar,
  TimeWheel,
  createActionSheet,
} from "@/registry/uiset/ui/mobile"
import { Icon } from "@/registry/uiset/ui/shell/icons"
import { toast } from "@/registry/uiset/ui/toast"

type Message = { id: string; from: string; subject: string; time: string; unread: boolean }

const seed: Message[] = [
  { id: "m1", from: "Grace Hopper", subject: "Compiler notes for Friday", time: "9:41", unread: true },
  { id: "m2", from: "Ada Lovelace", subject: "The engine's second table", time: "8:12", unread: true },
  { id: "m3", from: "Linus Pauling", subject: "Lab booking moved", time: "Yesterday", unread: false },
  { id: "m4", from: "Margaret Hamilton", subject: "Launch checklist, final", time: "Mon", unread: false },
]

const later: Message = { id: "m5", from: "Katherine Johnson", subject: "Trajectory figures attached", time: "Now", unread: true }

const time12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number]
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`
}

// A phone app: an inbox you swipe and pull to refresh, alarms set on a wheel in a sheet,
// an action sheet, and a tab bar along the bottom.
function MobileDemo() {
  const [tab, setTab] = useState("inbox")
  const [messages, setMessages] = useState(seed)
  const [alarms, setAlarms] = useState([{ id: "a1", time: "07:30", label: "Run" }])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState({ time: "08:00", label: "" })
  const [actions] = useState(createActionSheet)
  const unread = messages.filter((m) => m.unread).length

  const act = (id: string, action: string) => {
    const message = messages.find((m) => m.id === id)
    if (!message) return
    if (action === "read") setMessages((all) => all.map((m) => (m.id === id ? { ...m, unread: !m.unread } : m)))
    else {
      setMessages((all) => all.filter((m) => m.id !== id))
      toast(action === "archive" ? "Archived" : "Deleted", {
        action: { label: "Undo", onAction: () => setMessages((all) => [...all, message].sort((a, b) => a.id.localeCompare(b.id))) },
      })
    }
  }

  const options = async () => {
    const choice = await actions.choose()
    if (choice === "read-all") setMessages((all) => all.map((m) => ({ ...m, unread: false })))
    if (choice === "clear") {
      // Deleting everything can be taken back, like deleting one.
      const before = messages
      setMessages([])
      toast(`Deleted ${before.length} messages`, { action: { label: "Undo", onAction: () => setMessages(before) } })
    }
  }

  return (
    <div className="mobile-demo mobile-frame" data-phone="">
      {tab === "inbox" ? (
        <>
          <AppBar
            title="Inbox"
            actions={
              <Button
                variant="ghost"
                aria-label="Inbox options"
                onClick={() => void options()}
              >
                <Icon name="more" />
              </Button>
            }
          />
          <PullToRefresh
            className="mobile-demo-body"
            onRefresh={() =>
              new Promise((resolve) =>
                setTimeout(() => {
                  setMessages((all) => (all.some((m) => m.id === later.id) ? all : [later, ...all]))
                  resolve(undefined)
                }, 700),
              )
            }
          >
            <SwipeList
              label="Messages"
              onOpen={(id) => {
                setMessages((all) => all.map((m) => (m.id === id ? { ...m, unread: false } : m)))
                toast(`Opened “${messages.find((m) => m.id === id)?.subject}”`)
              }}
              onAction={act}
              items={messages.map((m) => ({
                id: m.id,
                label: `${m.unread ? "Unread, " : ""}${m.from}: ${m.subject}, ${m.time}`,
                start: [{ id: "read", label: m.unread ? "Read" : "Unread", icon: "mail", tone: "accent" }],
                end: [
                  { id: "archive", label: "Archive", icon: "archive", tone: "neutral" },
                  { id: "delete", label: "Delete", icon: "trash", tone: "danger" },
                ],
                content: (
                  <span className="mobile-message" data-unread={m.unread ? "" : undefined}>
                    <span className="mobile-message-from">{m.from}</span>
                    <span className="mobile-message-time">{m.time}</span>
                    <span className="mobile-message-subject">{m.subject}</span>
                  </span>
                ),
              }))}
            />
            {!messages.length && <p className="mobile-demo-empty">No messages. Pull down to check again.</p>}
          </PullToRefresh>
          <ActionSheet
            controller={actions}
            title="Inbox"
            actions={[
              { value: "read-all", label: "Mark all as read" },
              { value: "clear", label: "Delete all", destructive: true },
            ]}
          />
        </>
      ) : tab === "alarms" ? (
        <>
          <AppBar
            title="Alarms"
            actions={
              <Button variant="ghost" aria-label="New alarm" onClick={() => setSheetOpen(true)}>
                <Icon name="plus" />
              </Button>
            }
          />
          <div className="mobile-demo-body">
            <ul className="mobile-alarms">
              {alarms.map((alarm) => (
                <li key={alarm.id}>
                  <span className="mobile-alarm-time">{time12(alarm.time)}</span>
                  <span className="mobile-alarm-label">{alarm.label || "Alarm"}</span>
                </li>
              ))}
            </ul>
          </div>
          <Sheet title="New alarm" open={sheetOpen} onOpenChange={setSheetOpen} snapPoints={["content"]}>
            <TimeWheel label="Alarm time" value={draft.time} onValueChange={(time) => setDraft((d) => ({ ...d, time }))} />
            <Field name="alarm-label">
              <FieldLabel>Label</FieldLabel>
              <Input value={draft.label} onValueChange={(label: string) => setDraft((d) => ({ ...d, label }))} placeholder="Alarm" />
            </Field>
            <Button
              onClick={() => {
                setAlarms((all) => [...all, { id: crypto.randomUUID(), ...draft }].sort((a, b) => a.time.localeCompare(b.time)))
                setSheetOpen(false)
                toast(`Alarm set for ${time12(draft.time)}`)
              }}
            >
              Save alarm for {time12(draft.time)}
            </Button>
          </Sheet>
        </>
      ) : (
        <>
          <AppBar title="Settings" />
          <div className="mobile-demo-body">
            <p className="mobile-demo-empty">Settings go here.</p>
            {/* Two resting heights: half the screen, then all of it. */}
            <Sheet
              title="Help"
              description="Drag the sheet up, or press its handle, to read more."
              snapPoints={[0.5, 1]}
              trigger={
                <DrawerTrigger render={<Button variant="outline" className="mobile-demo-help" />}>Help</DrawerTrigger>
              }
            >
              <p>Swipe a message left to archive or delete it, or right to mark it read.</p>
              <p>Pull the inbox down from the top to check for new mail.</p>
              <p>Alarms ring at the time on the wheels; give one a label to tell them apart.</p>
              <p>Every action has a menu too, for screen readers and keyboards.</p>
            </Sheet>
          </div>
        </>
      )}
      <TabBar
        value={tab}
        onValueChange={setTab}
        items={[
          { id: "inbox", label: "Inbox", icon: "inbox", badge: unread },
          { id: "alarms", label: "Alarms", icon: "bell" },
          { id: "settings", label: "Settings", icon: "settings" },
        ]}
      />
    </div>
  )
}

export { MobileDemo }
