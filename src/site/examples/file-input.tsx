import {
  FileInput,
  FileInputDropzone,
  FileInputItem,
  FileInputItemRemove,
  FileInputList,
  FileInputTrigger,
  formatFileSize,
} from "@/registry/uiset/ui/file-input"

export default function FileInputExample() {
  return (
    <FileInput multiple accept="image/*,.pdf" className="stack">
      <FileInputDropzone className="dropzone">
        <p>Drop images or PDFs here, or paste them.</p>
        <FileInputTrigger>Choose images or PDFs</FileInputTrigger>
      </FileInputDropzone>
      <FileInputList aria-label="Chosen files">
        <FileInputItem className="row">
          {({ file }) => (
            <>
              <span>{file.name}</span>
              <span className="example-note">{formatFileSize(file.size)}</span>
              <FileInputItemRemove aria-label={`Remove ${file.name}`} />
            </>
          )}
        </FileInputItem>
      </FileInputList>
    </FileInput>
  )
}
