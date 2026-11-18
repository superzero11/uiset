# Mobile

The parts of a phone app, on UI SDK's gesture behaviors and components. Every gesture has
a keyboard path and a screen reader path, and every part works with a mouse too.

```bash
npx shadcn@latest add @uiset/mobile
```

## Parts

| Part                 | What it is                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `SwipeList`          | Rows that swipe aside to actions on either side; a long swipe runs the first (`createSwipeActions`) |
| `PullToRefresh`      | Pull down at the top to refresh, with resistance (`rubberBand`); a Refresh button for the keyboard |
| `WheelPicker`        | A wheel you scroll to choose from (`bindScrollPicker` on a Listbox)                          |
| `TimeWheel`          | Hour, minute and AM/PM wheels, as `"HH:MM"`                                                  |
| `Sheet`              | A bottom sheet, as tall as its content or resting at snap points (Drawer)                     |
| `ActionSheet`        | A sheet of choices with Cancel; `await sheet.choose()` returns the one chosen                |
| `AppBar`, `TabBar`   | The top bar (back, title, actions) and the bottom bar (sections, the current one marked)     |

## Use

```tsx
function Inbox() {
  const [sheet] = useState(createActionSheet)
  const options = async () => {
    const choice = await sheet.choose() // "read-all", or undefined for Cancel
    if (choice === "read-all") markAllRead()
  }
  return (
    <>
      <AppBar title="Inbox" actions={<Button aria-label="Inbox options" onClick={() => void options()}>…</Button>} />
      <PullToRefresh onRefresh={() => fetchMail()} onError={report}>
        <SwipeList
          label="Messages"
          items={messages.map((m) => ({
            id: m.id,
            label: `${m.from}: ${m.subject}`,
            content: <MessageRow message={m} />,
            start: [{ id: "read", label: "Read", icon: "mail" }],
            end: [
              { id: "archive", label: "Archive", icon: "archive", tone: "neutral" },
              { id: "delete", label: "Delete", icon: "trash", tone: "danger" },
            ],
          }))}
          onOpen={open}
          onAction={(id, action) => run(id, action)}
        />
      </PullToRefresh>
      <ActionSheet controller={sheet} title="Inbox" actions={[{ value: "read-all", label: "Mark all as read" }]} />
      <TabBar value={tab} onValueChange={setTab}
        items={[{ id: "inbox", label: "Inbox", icon: "inbox", badge: 2 }, { id: "alarms", label: "Alarms", icon: "bell" }]} />
    </>
  )
}

<Sheet title="New alarm" open={open} onOpenChange={setOpen}>
  <TimeWheel label="Alarm time" value={time} onValueChange={setTime} />
</Sheet>

<Sheet title="Help" snapPoints={[0.5, 1]} trigger={<DrawerTrigger>Help</DrawerTrigger>}>…</Sheet>
```

- `start` actions show by swiping toward the end (left to right in English), `end` actions
  the other way; it flips in right-to-left pages. A side's first action sits at the row's
  edge. Past `fullSwipe` (0.6 of the row) that action fills the row, and letting go runs it
  and announces it. Hidden actions are inert.
- After an action, focus goes back to its row, or, if the row went (archived, deleted), to
  the row now in its place. A tap on an open row closes it instead of opening the row.
- Each row with actions also has an Actions menu. It's out of the tab order (a row is one tab
  stop) and out of sight, but screen readers reach it with their own keys and swipes, where
  neither swipes nor arrows reach the actions; it shows while it has focus.
- A row without `label` is named by its content's text.
- `PullToRefresh` waits for its `onRefresh` Promise. A rejected one is announced ("Couldn't
  refresh.") and handed to `onError`. Pulls only start at the top and only downward, so the
  list still scrolls; a short pull springs back. The pull moves by a CSS variable, so a pull
  doesn't re-render the list.
- A `Sheet` with one snap point (the default, `"content"`) is as tall as its content and has
  a plain bar. With more it's 85% of the screen, UI SDK's limit for a drawer, and its handle
  is a button that steps through the points. Drawer's other props (`dismissible`,
  `defaultOpen`, `modalAbove`, …) pass through.
- `WheelPicker` keeps focus on its value: when the value changes from outside, focus in the
  wheel moves with it, so nothing that reveals the focused option scrolls the wheel back.
  `TimeWheel` shows a value between its `minuteStep`s too (07 with a step of 5).
- A `TabBar` item with `href` is a link, and a click with a modifier key is left to the
  browser (a new tab); without `href` it's a UI SDK Button. Badges are a number on screen and
  words in the name ("Inbox, 2 new").
- `AppBar` takes `headingLevel` (1 by default) to fit the page's outline.
- Accent text uses `--mobile-accent`, the primary pulled toward the text color so it clears
  4.5:1 in every skin. Focus on a filled swipe action is drawn in its own text color.

## Keys

| Part          | Keys                                                                 |
| ------------- | -------------------------------------------------------------------- |
| SwipeList     | Up and Down between rows (one tab stop); Left and Right show a row's actions and focus the first; Escape closes them; Enter opens the row |
| PullToRefresh | Tab reaches a Refresh button at the top of the list                  |
| WheelPicker   | Arrows, Home, End, Page Up and Down, and typing, like any Listbox     |
| Sheet         | Escape closes; the handle steps through snap points with Enter, or arrows, Home and End |

## Touch

Rows swipe with a finger without stopping the list from scrolling up and down
(`touch-action: pan-y`). At the top of the list, a finger pulling down is the refresh's,
and scrolling down stays the browser's. Nothing gets selected while a row swipes or the
list pulls. Wheels snap to an option (`scroll-snap-type`).

## For agents

- **Messages** (the `SwipeList`'s label): `runAction(row, action)` runs a row's action by
  names people see, like `runAction("Ada Lovelace", "Archive")`; `openRow(row)` opens one. Agents read the
  rows with `query`, each with its actions. A `danger` action isn't run this way: the step
  fails with "Needs a person" and points at the row's Actions menu, whose item carries
  `data-agent-confirm`, so pressing it there asks the person.
- `ActionSheet` choices marked `destructive` carry `data-agent-confirm` too.
- Tab bar sections, app bar buttons, wheels (`setValue` on "Alarm time, hour") and sheets are
  UI SDK components agents use by name.

## Other languages

Every word the parts say is a prop: `SwipeList messages` (`help`, `actionsFor`),
`PullToRefresh messages` (`refresh`, `pull`, `release`, `refreshing`, `done`, `failed`),
`TimeWheel labels` (`hour`, `minute`, `period`, `am`, `pm`), `Sheet resizeLabel`,
`ActionSheet cancelLabel`, `TabBar label` and `badgeLabel`, `AppBar backLabel`.

## Known limits

- With reduced motion, a press on a sheet's handle in the first moments after it opens
  closes it instead of resizing it (UI SDK's Drawer; reported upstream).
- `TimeWheel` is a 12- or 24-hour clock in its own words; it doesn't read the page's locale.
