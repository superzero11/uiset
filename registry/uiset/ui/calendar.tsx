"use client"

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
} from "@ui-sdk/react/calendar"
import type * as React from "react"

function Calendar({ children, ...props }: React.ComponentProps<typeof CalendarRoot>) {
  return (
    <CalendarRoot {...props}>
      {children ?? (
        <>
          <CalendarPrevious />
          <CalendarHeading />
          <CalendarNext />
          <CalendarGrid>
            <CalendarWeekdays>
              {(index) => <CalendarWeekday index={index} />}
            </CalendarWeekdays>
            <CalendarWeeks>{(cell) => <CalendarDay value={cell.date} />}</CalendarWeeks>
          </CalendarGrid>
        </>
      )}
    </CalendarRoot>
  )
}

export {
  Calendar,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
}
export {
  CalendarMonthSelect,
  CalendarYearSelect,
  createCalendarController,
} from "@ui-sdk/react/calendar"
