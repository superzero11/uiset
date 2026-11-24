import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "../../src/select"

export default function SelectExample() {
  return (
    <Select defaultValue="editor">
      <SelectLabel>Role</SelectLabel>
      <SelectTrigger />
      <SelectContent>
        <SelectItem value="viewer">Viewer</SelectItem>
        <SelectItem value="editor">Editor</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  )
}
