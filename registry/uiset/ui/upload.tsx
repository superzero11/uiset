"use client"

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { Button } from "./button"
import {
  FileInput,
  FileInputDropzone,
  FileInputItem,
  FileInputItemRemove,
  FileInputList,
  FileInputTrigger,
  formatFileSize,
  type FileRejection,
} from "./file-input"
import { Progress } from "./progress"
import { Icon } from "./shell/icons"
import {
  createUploadQueue,
  type UploadItem,
  type UploadQueue,
  type UploadQueueOptions,
} from "./upload/queue"
import "./shell/shell.css"
import "./upload/upload.css"

/** The queue for a set of files. `<Upload>` uses it; use it yourself for a layout of your own. */
function useUploadQueue(files: readonly File[], options: UploadQueueOptions) {
  const latest = useRef(options)
  latest.current = options
  const [queue] = useState(() => createUploadQueue(() => latest.current))
  const items = useSyncExternalStore(queue.subscribe, queue.items, queue.items)
  useEffect(() => {
    queue.start()
    return () => queue.stop()
  }, [queue])
  useEffect(() => queue.sync(files), [queue, files])
  return { queue, items }
}

type UploadLabels = {
  prompt: ReactNode
  choose: ReactNode
  queued: string
  uploading: (percent: number) => string
  done: string
  failed: (error: string) => string
  canceled: string
  cancel: (name: string) => string
  retry: (name: string) => string
  remove: (name: string) => string
  progress: (name: string) => string
  retryHint: string
  rejected: (rejection: FileRejection, limits: { maxSize?: number; maxFiles?: number }) => string
}

const reasons: Record<string, (limits: { maxSize?: number; maxFiles?: number }) => string> = {
  "file-type": () => "isn't a type this takes",
  "file-too-large": ({ maxSize }) =>
    maxSize ? `is larger than ${formatFileSize(maxSize)}` : "is too large",
  "file-too-small": () => "is too small",
  "too-many-files": ({ maxFiles }) =>
    maxFiles ? `is over the limit of ${maxFiles} files` : "is one file too many",
}

const defaultLabels: UploadLabels = {
  prompt: "Drop files here, or paste them",
  choose: "Choose files",
  queued: "Waiting",
  uploading: (percent) => `Uploading, ${percent}%`,
  done: "Uploaded",
  failed: (error) => `Failed: ${error}`,
  canceled: "Canceled",
  cancel: (name) => `Cancel ${name}`,
  retry: (name) => `Retry ${name}`,
  remove: (name) => `Remove ${name}`,
  progress: (name) => `Uploading ${name}`,
  retryHint: "Press Enter to retry.",
  rejected: ({ file, reasons: why }, limits) =>
    `${file.name} ${why.map((reason) => reasons[reason]?.(limits) ?? reason).join(" and ")}.`,
}

function statusText(item: UploadItem, labels: UploadLabels) {
  if (item.status === "uploading") return labels.uploading(Math.round(item.progress * 100))
  if (item.status === "failed") return labels.failed(item.error ?? "")
  return labels[item.status]
}

/** A small picture of an image file, or a file icon for anything else. */
function UploadPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string>()
  const image = file.type.startsWith("image/")
  useEffect(() => {
    if (!image) return
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file, image])
  return (
    <span className="upload-preview" aria-hidden="true">
      {url ? <img src={url} alt="" /> : <Icon name={image ? "image" : "file"} />}
    </span>
  )
}

/** One file's row: its preview, name, size and status, a progress bar, and its buttons. */
function UploadRow({
  file,
  item,
  queue,
  labels,
}: {
  file: File
  item: UploadItem | undefined
  queue: UploadQueue
  labels: UploadLabels
}) {
  const current = item ?? { file, status: "queued" as const, progress: 0 }
  const { status } = current
  const stopped = status === "failed" || status === "canceled"
  return (
    <div className="upload-row" data-status={status}>
      <UploadPreview file={file} />
      <div className="upload-text">
        <span className="upload-name">{file.name}</span>
        <span className="upload-status">
          {formatFileSize(file.size)}
          <span aria-hidden="true"> · </span>
          <span className="upload-state">{statusText(current, labels)}</span>
          {stopped && <span className="uiset-visually-hidden"> {labels.retryHint}</span>}
        </span>
        {status === "uploading" && (
          <Progress
            className="upload-progress"
            value={Math.round(current.progress * 100)}
            aria-label={labels.progress(file.name)}
          />
        )}
      </div>
      {/* Like Remove, these stay out of the Tab order: the row itself takes Enter to retry
          and Delete to remove, which also stops an upload. */}
      {stopped && (
        <Button
          variant="ghost"
          className="upload-action"
          tabIndex={-1}
          aria-label={labels.retry(file.name)}
          onClick={() => queue.retry(file)}
        >
          <Icon name="retry" />
        </Button>
      )}
      {(status === "queued" || status === "uploading") && (
        <Button
          variant="ghost"
          className="upload-action"
          tabIndex={-1}
          aria-label={labels.cancel(file.name)}
          onClick={() => queue.cancel(file)}
        >
          <Icon name="close" />
        </Button>
      )}
      {status !== "queued" && status !== "uploading" && (
        <FileInputItemRemove className="upload-action" aria-label={labels.remove(file.name)}>
          <Icon name="trash" />
        </FileInputItemRemove>
      )}
    </div>
  )
}

type FileInputProps = ComponentProps<typeof FileInput>

type UploadProps = Omit<FileInputProps, "children" | "value" | "defaultValue" | "onValueChange"> &
  UploadQueueOptions & {
    /** Names the list of files, like "Attachments". */
    label: string
    /** A line under the prompt, like "PNG, JPG or PDF, up to 10 MB each". */
    hint?: ReactNode
    value?: File[]
    defaultValue?: File[]
    onValueChange?: (files: File[]) => void
    /** Runs whenever a file's status or progress changes. */
    onItemsChange?: (items: readonly UploadItem[]) => void
    labels?: Partial<UploadLabels>
  }

function Upload({
  label,
  hint,
  upload,
  concurrency,
  onUploaded,
  onFailed,
  messages,
  value,
  defaultValue,
  onValueChange,
  onItemsChange,
  onReject,
  labels: ownLabels,
  multiple = true,
  className,
  ...props
}: UploadProps) {
  const labels = { ...defaultLabels, ...ownLabels }
  const [own, setOwn] = useState<File[]>(defaultValue ?? [])
  const files = value ?? own
  const { queue, items } = useUploadQueue(files, { upload, concurrency, onUploaded, onFailed, messages })
  const [rejected, setRejected] = useState<FileRejection[]>([])
  const report = useRef(onItemsChange)
  report.current = onItemsChange
  useEffect(() => report.current?.(items), [items])

  // The list is one tab stop and its rows take the keys, so Enter on a row that stopped
  // sends it again: the Retry button itself is out of the Tab order, like Remove.
  const retryOnEnter = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter") return
    const row = event.target as HTMLElement
    if (row.getAttribute("data-slot") !== "file-input-item") return
    const file = files[Array.prototype.indexOf.call(event.currentTarget.children, row)]
    if (file && queue.retry(file)) event.preventDefault()
  }

  return (
    <FileInput
      {...props}
      multiple={multiple}
      role="group"
      aria-label={label}
      className={["upload", className].filter(Boolean).join(" ")}
      value={files}
      onValueChange={(next) => {
        setOwn(next)
        setRejected([])
        onValueChange?.(next)
      }}
      onReject={(rejections, details) => {
        setRejected(rejections)
        onReject?.(rejections, details)
      }}
    >
      <FileInputDropzone className="upload-dropzone">
        <Icon name="upload" className="upload-icon" />
        <p>{labels.prompt}</p>
        {hint && <p>{hint}</p>}
        <FileInputTrigger>{labels.choose}</FileInputTrigger>
      </FileInputDropzone>
      {rejected.length > 0 && (
        <ul className="upload-rejected">
          {rejected.map((rejection, index) => (
            <li key={`${rejection.file.name}:${index}`}>
              {labels.rejected(rejection, { maxSize: props.maxSize, maxFiles: props.maxFiles })}
            </li>
          ))}
        </ul>
      )}
      <FileInputList aria-label={label} className="upload-list" onKeyDown={retryOnEnter}>
        <FileInputItem>
          {({ file }) => (
            <UploadRow
              file={file}
              item={items.find((item) => item.file === file)}
              queue={queue}
              labels={labels}
            />
          )}
        </FileInputItem>
      </FileInputList>
    </FileInput>
  )
}

export { Upload, UploadPreview, UploadRow, useUploadQueue }
export { createUploadQueue } from "./upload/queue"
export type { UploadLabels, UploadProps }
export type {
  UploadItem,
  UploadMessages,
  UploadQueue,
  UploadQueueOptions,
  UploadStatus,
  Uploader,
} from "./upload/queue"
