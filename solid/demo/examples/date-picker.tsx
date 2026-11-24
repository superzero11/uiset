import {
  DatePicker,
  DatePickerContent,
  DatePickerInput,
  DatePickerTrigger,
} from "../../src/date-picker"

export default function DatePickerExample() {
  return (
    <div class="row">
      <DatePicker defaultValue="2026-11-20">
        <DatePickerInput aria-label="Due date" />
        <DatePickerTrigger aria-label="Choose due date" />
        <DatePickerContent />
      </DatePicker>
    </div>
  )
}
