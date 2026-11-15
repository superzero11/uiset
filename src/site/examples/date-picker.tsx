import {
  DatePicker,
  DatePickerContent,
  DatePickerInput,
  DatePickerTrigger,
} from "@/registry/uiset/ui/date-picker"

export default function DatePickerExample() {
  return (
    <div className="row">
      <DatePicker defaultValue="2026-11-20">
        <DatePickerInput aria-label="Due date" />
        <DatePickerTrigger aria-label="Choose due date" />
        <DatePickerContent />
      </DatePicker>
    </div>
  )
}
