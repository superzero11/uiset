import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { Button } from "../../src/button"
import { DrawerTrigger } from "../../src/drawer"
import { Field, FieldLabel, Input } from "../../src/field"
import { ActionSheet, AppBar, PullToRefresh, Sheet, SwipeList, TabBar, TimeWheel, createActionSheet, type SwipeListItem } from "../../src/mobile"
import { Icon } from "../../src/shell/icons"
import { toast } from "../../src/toast"

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
// an action sheet, and a tab bar along the bottom. React's (src/site/examples/mobile.tsx).
export default function MobileExample() {
  const [tab, setTab] = createSignal("inbox")
  const [messages, setMessages] = createSignal(seed)
  const [alarms, setAlarms] = createSignal([{ id: "a1", time: "07:30", label: "Run" }])
  const [sheetOpen, setSheetOpen] = createSignal(false)
  const [draft, setDraft] = createSignal({ time: "08:00", label: "" })
  const actions = createActionSheet()
  const unread = () => messages().filter((m) => m.unread).length

  const act = (id: string, action: string) => {
    const message = messages().find((m) => m.id === id)
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
      const before = messages()
      setMessages([])
      toast(`Deleted ${before.length} messages`, { action: { label: "Undo", onAction: () => setMessages(before) } })
    }
  }

  // One memo, so the rows' content is made once per change, not on every read.
  const items = createMemo((): SwipeListItem[] =>
    messages().map((m) => ({
      id: m.id,
      label: `${m.unread ? "Unread, " : ""}${m.from}: ${m.subject}, ${m.time}`,
      start: [{ id: "read", label: m.unread ? "Read" : "Unread", icon: "mail", tone: "accent" }],
      end: [
        { id: "archive", label: "Archive", icon: "archive", tone: "neutral" },
        { id: "delete", label: "Delete", icon: "trash", tone: "danger" },
      ],
      content: (
        <span class="mobile-message" data-unread={m.unread ? "" : undefined}>
          <span class="mobile-message-from">{m.from}</span>
          <span class="mobile-message-time">{m.time}</span>
          <span class="mobile-message-subject">{m.subject}</span>
        </span>
      ),
    })),
  )

  return (
    <div class="mobile-demo mobile-frame" data-phone="">
      <Switch>
        <Match when={tab() === "inbox"}>
          <AppBar
            title="Inbox"
            actions={
              <Button variant="ghost" aria-label="Inbox options" onClick={() => void options()}>
                <Icon name="more" />
              </Button>
            }
          />
          <PullToRefresh
            class="mobile-demo-body"
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
                toast(`Opened “${messages().find((m) => m.id === id)?.subject}”`)
              }}
              onAction={act}
              items={items()}
            />
            <Show when={!messages().length}>
              <p class="mobile-demo-empty">No messages. Pull down to check again.</p>
            </Show>
          </PullToRefresh>
          <ActionSheet
            controller={actions}
            title="Inbox"
            actions={[
              { value: "read-all", label: "Mark all as read" },
              { value: "clear", label: "Delete all", destructive: true },
            ]}
          />
        </Match>
        <Match when={tab() === "alarms"}>
          <AppBar
            title="Alarms"
            actions={
              <Button variant="ghost" aria-label="New alarm" onClick={() => setSheetOpen(true)}>
                <Icon name="plus" />
              </Button>
            }
          />
          <div class="mobile-demo-body">
            <ul class="mobile-alarms">
              <For each={alarms()} keyed={(alarm) => alarm.id}>
                {(alarm) => (
                  <li>
                    <span class="mobile-alarm-time">{time12(alarm().time)}</span>
                    <span class="mobile-alarm-label">{alarm().label || "Alarm"}</span>
                  </li>
                )}
              </For>
            </ul>
          </div>
          <Sheet
            title="New alarm"
            open={sheetOpen()}
            onOpenChange={(open: boolean) => {
              setSheetOpen(open)
            }}
            snapPoints={["content"]}
          >
            <TimeWheel label="Alarm time" value={draft().time} onValueChange={(time) => setDraft((d) => ({ ...d, time }))} />
            <Field name="alarm-label">
              <FieldLabel>Label</FieldLabel>
              <Input
                value={draft().label}
                onValueChange={(label: string) => {
                  setDraft((d) => ({ ...d, label }))
                }}
                placeholder="Alarm"
              />
            </Field>
            <Button
              onClick={() => {
                const next = draft()
                setAlarms((all) => [...all, { id: crypto.randomUUID(), ...next }].sort((a, b) => a.time.localeCompare(b.time)))
                setSheetOpen(false)
                toast(`Alarm set for ${time12(next.time)}`)
              }}
            >
              Save alarm for {time12(draft().time)}
            </Button>
          </Sheet>
        </Match>
        <Match when={tab() === "settings"}>
          <AppBar title="Settings" />
          <div class="mobile-demo-body">
            <p class="mobile-demo-empty">Settings go here.</p>
            {/* Two resting heights: half the screen, then all of it. */}
            <Sheet
              title="Help"
              description="Drag the sheet up, or press its handle, to read more."
              snapPoints={[0.5, 1]}
              trigger={
                <DrawerTrigger render={(props: object) => <Button variant="outline" class="mobile-demo-help" {...props} />}>Help</DrawerTrigger>
              }
            >
              <p>Swipe a message left to archive or delete it, or right to mark it read.</p>
              <p>Pull the inbox down from the top to check for new mail.</p>
              <p>Alarms ring at the time on the wheels; give one a label to tell them apart.</p>
              <p>Every action has a menu too, for screen readers and keyboards.</p>
            </Sheet>
          </div>
        </Match>
      </Switch>
      <TabBar
        value={tab()}
        onValueChange={(id) => {
          setTab(id)
        }}
        items={[
          { id: "inbox", label: "Inbox", icon: "inbox", badge: unread() },
          { id: "alarms", label: "Alarms", icon: "bell" },
          { id: "settings", label: "Settings", icon: "settings" },
        ]}
      />
    </div>
  )
}
