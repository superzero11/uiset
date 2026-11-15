import { useState } from "react"
import { Button } from "@/registry/uiset/ui/button"
import {
  createScheduleController,
  EventDialog,
  Schedule,
  type EventDraft,
  type ScheduleEvent,
  type ScheduleTrack,
} from "@/registry/uiset/ui/scheduler"

const rooms: ScheduleTrack[] = [
  { id: "atlas", label: "Atlas room, 6 seats", short: "Atlas · 6" },
  { id: "studio", label: "Studio, 12 seats", short: "Studio · 12" },
  { id: "stage", label: "Main stage, 80 seats", short: "Main stage · 80" },
]

// Room bookings: rooms down the side, the day across; bookings can't overlap.
export default function SchedulerTimelineExample() {
  const [schedule] = useState(createScheduleController)
  const [open, setOpen] = useState<EventDraft | null>(null)
  const [bookings, setBookings] = useState<ScheduleEvent[]>([
    { id: "b1", track: "atlas", start: 9 * 60, end: 10 * 60, title: "Standup", color: 1 },
    {
      id: "b2",
      track: "studio",
      start: 10 * 60,
      end: 12 * 60,
      title: "Design review",
      color: 2,
    },
    {
      id: "b3",
      track: "stage",
      start: 14 * 60,
      end: 16 * 60 + 30,
      title: "Launch rehearsal",
      color: 5,
    },
    {
      id: "b4",
      track: "atlas",
      start: 13 * 60,
      end: 14 * 60,
      title: "Interview",
      color: 4,
    },
  ])
  const save = (booking: ScheduleEvent) =>
    setBookings((all) =>
      all.some((b) => b.id === booking.id)
        ? all.map((b) => (b.id === booking.id ? booking : b))
        : [...all, booking],
    )
  return (
    <div className="scheduler-demo">
      <div className="scheduler-toolbar">
        <Button
          onClick={() =>
            setOpen({
              track: "atlas",
              start: 15 * 60,
              end: 16 * 60,
              title: "Booked",
              color: 6,
            })
          }
        >
          New booking
        </Button>
      </div>
      <Schedule
        label="Room bookings"
        controller={schedule}
        tracks={rooms}
        axis="x"
        overlap={false}
        step={30}
        startHour={8}
        endHour={18}
        events={bookings}
        onEventsChange={setBookings}
        onEventOpen={setOpen}
        onCreate={(span) => ({ ...span, title: "Booked", color: 6 })}
      />
      <EventDialog
        schedule={schedule}
        startHour={8}
        endHour={18}
        step={30}
        trackName="Room"
        event={open}
        tracks={rooms}
        onClose={() => setOpen(null)}
        onSave={save}
        onDelete={(booking) =>
          setBookings((all) => all.filter((b) => b.id !== booking.id))
        }
      />
    </div>
  )
}
