import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteLabel,
  AutocompleteList,
} from "@/registry/uiset/ui/autocomplete"

export default function AutocompleteExample() {
  return (
    <Autocomplete>
      <AutocompleteLabel>Framework</AutocompleteLabel>
      <AutocompleteInput placeholder="Type a framework…" />
      <AutocompleteContent>
        <AutocompleteEmpty>Keep typing your own</AutocompleteEmpty>
        <AutocompleteList>
          <AutocompleteItem value="Next.js">Next.js</AutocompleteItem>
          <AutocompleteItem value="Remix">Remix</AutocompleteItem>
          <AutocompleteItem value="SvelteKit">SvelteKit</AutocompleteItem>
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  )
}
