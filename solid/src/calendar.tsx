import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import {
  Calendar as CalendarRoot,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
} from "@ui-sdk/solid/calendar"

function Calendar(props: ComponentProps<typeof CalendarRoot>) {
  return (
    <CalendarRoot {...omit(props, "children")}>
      {props.children ?? (
        <>
          <CalendarPrevious />
          <CalendarHeading />
          <CalendarNext />
          <CalendarGrid>
            <CalendarWeekdays>{(index) => <CalendarWeekday index={index} />}</CalendarWeekdays>
            <CalendarWeeks>{(cell) => <CalendarDay value={cell.date} />}</CalendarWeeks>
          </CalendarGrid>
        </>
      )}
    </CalendarRoot>
  )
}

export { Calendar, CalendarDay, CalendarGrid, CalendarHeading, CalendarNext, CalendarPrevious, CalendarWeekday, CalendarWeekdays, CalendarWeeks }
export { CalendarMonthSelect, CalendarYearSelect, createCalendarController } from "@ui-sdk/solid/calendar"
