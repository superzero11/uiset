import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/registry/uiset/ui/combobox"

export default function ComboboxExample() {
  return (
    <Combobox>
      <ComboboxLabel>Timezone</ComboboxLabel>
      <ComboboxInput placeholder="Search timezones…" />
      <ComboboxContent>
        <ComboboxEmpty>No timezone found</ComboboxEmpty>
        <ComboboxList>
          <ComboboxItem value="utc">UTC</ComboboxItem>
          <ComboboxItem value="europe-berlin">Europe/Berlin</ComboboxItem>
          <ComboboxItem value="asia-kolkata">Asia/Kolkata</ComboboxItem>
          <ComboboxItem value="america-new-york">America/New York</ComboboxItem>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
