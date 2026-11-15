import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/uiset/ui/popover"

export default function PopoverExample() {
  return (
    <Popover>
      <PopoverTrigger>Share link</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Share this project</PopoverTitle>
        <PopoverDescription>Anyone with the link can view.</PopoverDescription>
        <div className="actions">
          <PopoverClose>Done sharing</PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  )
}
