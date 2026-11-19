# Scheduler

Calendars on UI SDK's `createSpans`: events people draw, move and resize with the
pointer or the keyboard, on a week, a day, or a timeline of rooms.

```bash
npx shadcn@latest add @uiset/scheduler
```

## Parts

| Part               | What it is                                                                 |
| ------------------ | -------------------------------------------------------------------------- |
| `Schedule`         | Tracks of events: days down a week (`axis="y"`), or rooms across a day (`axis="x"`) |
| `MonthView`        | A month on UI SDK's Calendar; each day lists its events; choosing a day opens it |
| `SchedulerToolbar` | Today, previous and next, the range shown, the view, New event           |
| `EventDialog`      | Create or edit: title, day, start, end, where; Delete asks first          |
| `createScheduleController` | Connects `EventDialog` (or your code) to a `Schedule`: its rules and its focus |

## Use

```tsx
const [schedule] = useState(createScheduleController)

<SchedulerToolbar title="Nov 16 – 22, 2026" view={view} onViewChange={setView} unit="week"
  onToday={…} onPrevious={…} onNext={…} onNewEvent={() => setOpen(draft)} />
<Schedule
  label="Team calendar"
  controller={schedule}
  tracks={days.map((d) => ({ id: d, label: longDate(d), short: shortDate(d) }))}
  events={events}
  onEventsChange={(next, { action, id }) => setEvents(next)}
  onEventOpen={setOpen}
  startHour={8}
  endHour={19}
  step={15}
  now={new Date()}
  timeZone="America/Los_Angeles"
  today={todayIso}
/>
<EventDialog schedule={schedule} startHour={8} endHour={19} step={15}
  event={open} tracks={tracks} onSave={save} onDelete={remove} onClose={() => setOpen(null)} />
```

- An event is `{ id, track, start, end, title, color?, location? }`; `start` and `end` are
  minutes from midnight, `track` is a day (an ISO date) or a room id.
- `overlap={false}` refuses bookings that collide, for every kind of input. With overlaps
  allowed, events share the day's width in lanes (`stackSpans`).
- `onCreate(span)` makes the event a draw or click creates; return `null` to refuse.
- `locked(event)` keeps an event from changing, for people and agents.
- **Time zones.** `start` and `end` are wall-clock minutes in the zone the schedule shows,
  and `track` is that zone's date. `now` is read in `timeZone` (the viewer's by default),
  so the current-time line and `today` agree. Convert stored instants to the zone at the
  edge; a 9:00 event stays at 9:00 across a daylight-saving change.
- `EventDialog` with the controller keeps the schedule's rules (hours, steps, overlaps)
  and says why a time won't do, on the field that's wrong. Focus goes back to the saved
  event, or to the next event once one is deleted.
- `size` is how long a click on an empty stretch makes an event. `renderEvent` replaces an
  event's face; `timeLabel` changes how times read (24-hour, other languages);
  `MonthView` takes `locale` and `timeLabel` too.
- On touch screens a finger scrolls the schedule; a tap makes an event, and events drag.
- **Narrow screens.** A week's days share the room down to 5.5rem each, so all seven fit
  beside a sidebar at 1440; narrower than that, the week scrolls sideways. A narrow event
  with room for three lines gives two to its title. On a phone, start on one day:
  `isNarrowScreen()` says whether the screen is under 40rem, so set the view after
  hydrating (`useLayoutEffect(() => { if (isNarrowScreen()) setView("day") }, [])`); the
  server can't know the width.

## Keys

| Keys                       | Does                                      |
| -------------------------- | ----------------------------------------- |
| Tab                        | Each event, in time order                 |
| Up, Down (Left, Right on a timeline) | Earlier or later by the step    |
| Left, Right (Up, Down on a timeline) | The previous or next day or room |
| Shift with those arrows    | Change when it ends                       |
| Delete, Backspace          | Remove it (the demo offers Undo)          |
| Enter, Space               | Open it (each event is a button)          |

New events by keyboard come from **New event**. Every move, resize and removal is
announced. Delete hands focus to the next event, or to the schedule when none is left.
Choosing a day in the month focuses that day's first event. In the month view each day is named with its events ("Wednesday, November
18, 2026, 2 events: Standup at 9:00 AM, Launch rehearsal at 3:00 PM").

## For agents

`addEvent(day, start, end, title)`, `moveEvent(event, day, start)`,
`resizeEvent(event, end)` and `openEvent(event)`, with times as `HH:MM` and days by name
("Tuesday"). They keep the same rules a drag does, and a time that doesn't fit says why.
Events are named by title or id; when two share a title, the error lists both with their
ids. The snapshot lists each event as `{ value: id, label: "Standup, Monday, …" }`.
Deleting goes through the dialog's confirm (`data-agent-confirm`), so a person approves
it; `removeEvent` stays on the API for your own code.
