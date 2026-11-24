import type { ComponentProps, JSX } from "@solidjs/web"
import { createEffect, createMemo, createSignal, For, omit, onCleanup, onSettled, Show } from "solid-js"
import { Button } from "./button"
import { FileInput, FileInputDropzone, FileInputItem, FileInputItemRemove, FileInputList, FileInputTrigger, formatFileSize, type FileRejection } from "./file-input"
import { Progress } from "./progress"
import { Icon } from "./shell/icons"
import { createUploadQueue, type UploadItem, type UploadQueue, type UploadQueueOptions } from "../../registry/uiset/ui/upload/queue"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/upload/upload.css"

/** The queue for a set of files. `<Upload>` uses it; use it yourself for a layout of your own. */
function useUploadQueue(files: () => readonly File[], options: () => UploadQueueOptions) {
  const queue = createUploadQueue(options)
  const [items, setItems] = createSignal(queue.items(), { ownedWrite: true })
  onSettled(() => {
    queue.start()
    const stop = queue.subscribe(() => setItems(queue.items()))
    return () => {
      stop()
      queue.stop()
    }
  })
  createEffect(files, (list) => queue.sync(list))
  return { queue, items }
}

type UploadLabels = {
  prompt: JSX.Element
  choose: JSX.Element
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
  "file-too-large": ({ maxSize }) => (maxSize ? `is larger than ${formatFileSize(maxSize)}` : "is too large"),
  "file-too-small": () => "is too small",
  "too-many-files": ({ maxFiles }) => (maxFiles ? `is over the limit of ${maxFiles} files` : "is one file too many"),
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
  rejected: ({ file, reasons: why }, limits) => `${file.name} ${why.map((reason) => reasons[reason]?.(limits) ?? reason).join(" and ")}.`,
}

function statusText(item: Pick<UploadItem, "status" | "progress" | "error">, labels: UploadLabels) {
  if (item.status === "uploading") return labels.uploading(Math.round(item.progress * 100))
  if (item.status === "failed") return labels.failed(item.error ?? "")
  return labels[item.status]
}

/** A small picture of an image file, or a file icon for anything else. */
function UploadPreview(props: { file: File }) {
  const image = () => props.file.type.startsWith("image/")
  // Made once on the page: the server has no address to give, so it and the hydrating page
  // both draw the file's icon first. The address lives as long as its file is the one shown.
  const [mounted, setMounted] = createSignal(false, { ownedWrite: true })
  onSettled(() => void setMounted(true))
  const url = createMemo(() => {
    if (!mounted() || !image()) return undefined
    const next = URL.createObjectURL(props.file)
    onCleanup(() => URL.revokeObjectURL(next))
    return next
  })
  return (
    <span class="upload-preview" aria-hidden="true">
      <Show when={url()} fallback={<Icon name={image() ? "image" : "file"} />}>
        {(src) => <img src={src()} alt="" />}
      </Show>
    </span>
  )
}

/** One file's row: its preview, name, size and status, a progress bar, and its buttons. */
function UploadRow(props: { file: File; item: UploadItem | undefined; queue: UploadQueue; labels: UploadLabels }) {
  const current = () => props.item ?? { file: props.file, status: "queued" as const, progress: 0, error: undefined }
  const status = () => current().status
  const stopped = () => status() === "failed" || status() === "canceled"
  return (
    <div class="upload-row" data-status={status()}>
      <UploadPreview file={props.file} />
      <div class="upload-text">
        <span class="upload-name">{props.file.name}</span>
        <span class="upload-status">
          {formatFileSize(props.file.size)}
          <span aria-hidden="true"> · </span>
          <span class="upload-state">{statusText(current(), props.labels)}</span>
          <Show when={stopped()}>
            <span class="uiset-visually-hidden"> {props.labels.retryHint}</span>
          </Show>
        </span>
        <Show when={status() === "uploading"}>
          <Progress class="upload-progress" value={Math.round(current().progress * 100)} aria-label={props.labels.progress(props.file.name)} />
        </Show>
      </div>
      {/* Like Remove, these stay out of the Tab order: the row itself takes Enter to retry
          and Delete to remove, which also stops an upload. */}
      <Show when={stopped()}>
        <Button variant="ghost" class="upload-action" tabindex={-1} aria-label={props.labels.retry(props.file.name)} onClick={() => props.queue.retry(props.file)}>
          <Icon name="retry" />
        </Button>
      </Show>
      <Show when={status() === "queued" || status() === "uploading"}>
        <Button variant="ghost" class="upload-action" tabindex={-1} aria-label={props.labels.cancel(props.file.name)} onClick={() => props.queue.cancel(props.file)}>
          <Icon name="close" />
        </Button>
      </Show>
      <Show when={status() !== "queued" && status() !== "uploading"}>
        <FileInputItemRemove class="upload-action" aria-label={props.labels.remove(props.file.name)}>
          <Icon name="trash" />
        </FileInputItemRemove>
      </Show>
    </div>
  )
}

type FileInputProps = ComponentProps<typeof FileInput>

type UploadProps = Omit<FileInputProps, "children" | "value" | "defaultValue" | "onValueChange"> &
  UploadQueueOptions & {
    /** Names the list of files, like "Attachments". */
    label: string
    /** A line under the prompt, like "PNG, JPG or PDF, up to 10 MB each". */
    hint?: JSX.Element
    value?: File[]
    defaultValue?: File[]
    onValueChange?: (files: File[]) => void
    /** Runs whenever a file's status or progress changes. */
    onItemsChange?: (items: readonly UploadItem[]) => void
    labels?: Partial<UploadLabels>
  }

function Upload(props: UploadProps) {
  const labels = () => ({ ...defaultLabels, ...props.labels })
  const [own, setOwn] = createSignal<File[]>(() => props.defaultValue ?? [])
  const files = () => props.value ?? own()
  const { queue, items } = useUploadQueue(files, () => ({ upload: props.upload, concurrency: props.concurrency, onUploaded: props.onUploaded, onFailed: props.onFailed, messages: props.messages }))
  const [rejected, setRejected] = createSignal<FileRejection[]>([])
  createEffect(items, (list) => props.onItemsChange?.(list))

  // The list is one tab stop and its rows take the keys, so Enter on a row that stopped
  // sends it again: the Retry button itself is out of the Tab order, like Remove.
  const retryOnEnter = (event: KeyboardEvent & { currentTarget: HTMLElement }) => {
    if (event.key !== "Enter") return
    const row = event.target as HTMLElement
    if (row.getAttribute("data-slot") !== "file-input-item") return
    const file = files()[Array.prototype.indexOf.call(event.currentTarget.children, row)]
    if (file && queue.retry(file)) event.preventDefault()
  }

  const rest = omit(props, "label", "hint", "upload", "concurrency", "onUploaded", "onFailed", "messages", "value", "defaultValue", "onValueChange", "onItemsChange", "onReject", "labels", "multiple", "class")
  return (
    <FileInput
      {...rest}
      multiple={props.multiple ?? true}
      role="group"
      aria-label={props.label}
      class={["upload", props.class as string | undefined]}
      value={files()}
      onValueChange={(next) => {
        setOwn(next)
        setRejected([])
        props.onValueChange?.(next)
      }}
      onReject={(rejections, details) => {
        setRejected(rejections)
        props.onReject?.(rejections, details)
      }}
    >
      <FileInputDropzone class="upload-dropzone">
        <Icon name="upload" class="upload-icon" />
        <p>{labels().prompt}</p>
        <Show when={props.hint}>{(hint) => <p>{hint()}</p>}</Show>
        {/* Named with the upload's label too: a page can hold several, each saying Choose files. */}
        <FileInputTrigger aria-label={`${labels().choose}, ${props.label}`}>{labels().choose}</FileInputTrigger>
      </FileInputDropzone>
      <Show when={rejected().length > 0}>
        <ul class="upload-rejected">
          <For each={rejected()}>{(rejection) => <li>{labels().rejected(rejection, { maxSize: props.maxSize, maxFiles: props.maxFiles })}</li>}</For>
        </ul>
      </Show>
      <FileInputList aria-label={props.label} class="upload-list" onKeyDown={retryOnEnter}>
        <FileInputItem>{({ file }) => <UploadRow file={file} item={items().find((item) => item.file === file)} queue={queue} labels={labels()} />}</FileInputItem>
      </FileInputList>
    </FileInput>
  )
}

export { Upload, UploadPreview, UploadRow, useUploadQueue }
export { createUploadQueue } from "../../registry/uiset/ui/upload/queue"
export type { UploadLabels, UploadProps }
export type { UploadItem, UploadMessages, UploadQueue, UploadQueueOptions, UploadStatus, Uploader } from "../../registry/uiset/ui/upload/queue"
