import { Listbox, ListboxItem, ListboxItemIndicator } from "@/registry/uiset/ui/listbox"

export default function ListboxExample() {
  return (
    <Listbox aria-label="Default branch" defaultValue="main">
      <ListboxItem value="main">
        main
        <ListboxItemIndicator />
      </ListboxItem>
      <ListboxItem value="develop">
        develop
        <ListboxItemIndicator />
      </ListboxItem>
      <ListboxItem value="release">
        release
        <ListboxItemIndicator />
      </ListboxItem>
    </Listbox>
  )
}
