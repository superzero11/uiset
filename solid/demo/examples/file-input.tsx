import {
  FileInput,
  FileInputDropzone,
  FileInputItem,
  FileInputItemRemove,
  FileInputList,
  FileInputTrigger,
  formatFileSize,
} from "../../src/file-input"

export default function FileInputExample() {
  return (
    <FileInput multiple accept="image/*,.pdf" class="stack">
      <FileInputDropzone class="dropzone">
        <p>Drop images or PDFs here, or paste them.</p>
        <FileInputTrigger>Choose images or PDFs</FileInputTrigger>
      </FileInputDropzone>
      <FileInputList aria-label="Chosen files">
        <FileInputItem class="row">
          {({ file }) => (
            <>
              <span>{file.name}</span>
              <span class="example-note">{formatFileSize(file.size)}</span>
              <FileInputItemRemove aria-label={`Remove ${file.name}`} />
            </>
          )}
        </FileInputItem>
      </FileInputList>
    </FileInput>
  )
}
