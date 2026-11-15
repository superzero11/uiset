import { Resizable, ResizableHandle, ResizablePanel } from "@/registry/uiset/ui/resizable"

export default function ResizableExample() {
  return (
    <Resizable className="resizable-demo" aria-label="Editor layout">
      <ResizablePanel defaultSize={35}>Files</ResizablePanel>
      <ResizableHandle aria-label="Resize file list" />
      <ResizablePanel>Editor</ResizablePanel>
    </Resizable>
  )
}
