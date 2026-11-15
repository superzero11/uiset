import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/uiset/ui/command"

export default function CommandExample() {
  return (
    <Command className="command-demo">
      <CommandInput aria-label="Search commands" placeholder="Search commands…" />
      <CommandEmpty>No commands found.</CommandEmpty>
      <CommandList>
        <CommandItem value="new-project">New project</CommandItem>
        <CommandItem value="invite">Invite teammate</CommandItem>
        <CommandItem value="billing">Open billing</CommandItem>
      </CommandList>
    </Command>
  )
}
