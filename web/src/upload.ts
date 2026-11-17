// The upload for Web Components, the twin of React's `Upload`: <uiset-upload label="Attachments">
// is UI SDK's file input (a drop zone, Choose files, paste) with a queue of uploads under it.
// It doesn't know where files go: `upload` is a function of yours that sends one file and
// reports progress. Each row shows a preview, the size, the status and a progress bar, with
// Cancel, Retry and Remove.
import "@ui-sdk/web/button"
import "@ui-sdk/web/file-input"
import "@ui-sdk/web/progress"
import { formatFileSize } from "@ui-sdk/web"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import { createUploadQueue, type UploadItem, type UploadMessages, type UploadQueue, type Uploader } from "@/registry/uiset/ui/upload/queue"
import "@/registry/uiset/ui/upload/upload.css"
import { attr, defineElement, Evented, h, keepInputInside, place, reportInput, showIn, upgradeProperties } from "./dom"

type Rejection = { file: File; reasons: string[] }

type UploadLabels = {
  prompt: string
  choose: string
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
  rejected: (rejection: Rejection, limits: { maxSize?: number; maxFiles?: number }) => string
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

/** What `<uiset-upload>` fires. */
type UISetUploadEvents = {
  /** Files added or removed: `value` is every file. */
  valuechange: CustomEvent<{ value: File[] }>
  /** A file's status or progress changed. */
  itemschange: CustomEvent<{ value: readonly UploadItem[] }>
  uploaded: CustomEvent<{ file: File; result: unknown }>
  failed: CustomEvent<{ file: File; error: string }>
  /** Files that failed the checks (`accept`, `max-size`, `max-files`), with why. */
  reject: CustomEvent<{ value: Rejection[] }>
}

type FileInputElement = HTMLElement & { value: File[]; maxSize?: number; maxFiles?: number }
type ItemElement = HTMLElement & { file?: File }
type RowView = { file: File; row: HTMLElement; text: HTMLElement; state: HTMLElement; hint: HTMLElement; progress: HTMLElement; retry: HTMLElement; cancel: HTMLElement; remove: HTMLElement; url?: string }

const ghost = (icon: Parameters<typeof iconElement>[0]) =>
  h("ui-button", null, h("button", { type: "button", "data-variant": "ghost", class: "upload-action", tabindex: "-1" }, iconElement(icon)))

/**
 * <uiset-upload label="Attachments" hint="PNG or PDF, up to 10 MB each" accept="image/*,.pdf"
 * max-size="10000000"> with `upload` set to your function. Files go up a few at a time
 * (`concurrency`, 3); `value` is the files, `labels` and `messages` word it. The list is one
 * tab stop: Enter on a row that stopped retries it, Delete removes it.
 */
class UISetUpload extends Evented<UISetUploadEvents>() {
  static observedAttributes = ["label", "hint", "accept", "max-size", "max-files", "multiple", "disabled", "name", "concurrency"]
  // Accessors over private fields, not plain fields: a field would replace a value a
  // framework set before the element was defined.
  #upload?: Uploader
  #messages?: Partial<UploadMessages>
  #labels: Partial<UploadLabels> = {}
  #pending?: File[]
  #queue: UploadQueue
  #rows = new Map<ItemElement, RowView>()
  #stop?: () => void
  #dom?: { input: FileInputElement; dropzone: HTMLElement; prompt: HTMLElement; hint: HTMLElement; choose: HTMLElement; rejected: HTMLElement; list: HTMLElement }

  constructor() {
    super()
    this.#queue = createUploadQueue(() => ({
      upload: this.#upload ?? (() => new Promise<never>(() => {})),
      concurrency: Number(this.getAttribute("concurrency")) || undefined,
      messages: this.#messages,
      onUploaded: (file, result) => this.dispatchEvent(new CustomEvent("uploaded", { detail: { file, result } })),
      onFailed: (file, error) => this.dispatchEvent(new CustomEvent("failed", { detail: { file, error } })),
    }))
  }

  /** Sends one file; see `Uploader`. Without it, files wait. */
  get upload(): Uploader | undefined {
    return this.#upload
  }
  set upload(value: Uploader | undefined) {
    this.#upload = value
  }
  /** What screen readers hear as each file finishes. */
  get messages(): Partial<UploadMessages> | undefined {
    return this.#messages
  }
  set messages(value: Partial<UploadMessages> | undefined) {
    this.#messages = value
  }
  get labels() {
    return this.#labels
  }
  set labels(value: Partial<UploadLabels>) {
    this.#labels = value ?? {}
    if (this.#dom) this.draw()
  }
  /** The files. Setting it fires nothing; each file is uploaded. */
  get value(): File[] {
    return this.#dom ? [...this.#dom.input.value] : [...(this.#pending ?? [])]
  }
  set value(files: File[]) {
    if (!this.#dom) {
      this.#pending = [...(files ?? [])]
      return
    }
    this.#dom.input.value = [...(files ?? [])]
    this.#queue.sync(this.#dom.input.value)
  }
  /** Each file's status, progress, error and result. */
  get items(): readonly UploadItem[] {
    return this.#queue.items()
  }

  private get words(): UploadLabels {
    return { ...defaultLabels, ...this.#labels }
  }

  connectedCallback() {
    upgradeProperties(this, ["upload", "messages", "labels", "value"])
    if (!this.#dom) this.build()
    if (this.#pending) {
      const files = this.#pending
      this.#pending = undefined
      this.value = files
    }
    this.#queue.start()
    this.#stop?.()
    this.#stop = this.#queue.subscribe(() => {
      this.drawRows()
      this.dispatchEvent(new CustomEvent("itemschange", { detail: { value: this.#queue.items() } }))
    })
    this.draw()
  }

  disconnectedCallback() {
    this.#stop?.()
    this.#stop = undefined
    this.#queue.stop()
  }

  attributeChangedCallback() {
    if (this.#dom) this.draw()
  }

  private build() {
    const prompt = h("p")
    const hint = h("p")
    const choose = h("button", { type: "button" })
    const dropzone = h("ui-file-input-dropzone", { class: "upload-dropzone" }, iconElement("upload"), prompt, hint, h("ui-file-input-trigger", null, choose))
    dropzone.firstElementChild?.classList.add("upload-icon")
    const rejected = h("ul", { class: "upload-rejected" })
    // Each file's row is filled in as the list adds it; the remove button is UI SDK's, so it
    // has to be in the template.
    const template = document.createElement("template")
    template.content.append(
      h(
        "ui-file-input-item",
        null,
        h("div", { class: "upload-row" }, h("ui-file-input-item-remove", null, h("button", { type: "button", "data-variant": "ghost", class: "upload-action" }, iconElement("trash")))),
      ),
    )
    const list = h("ui-file-input-list", { class: "upload-list" }, template)
    const input = h("ui-file-input", { class: "upload", role: "group" }, dropzone, list) as FileInputElement
    input.addEventListener("valuechange", (event) => {
      // Once the files are in: the event comes before the value changes.
      queueMicrotask(() => {
        if (event.defaultPrevented) return
        this.showRejected([])
        this.#queue.sync(input.value)
        this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: [...input.value] } }))
        reportInput(this)
      })
    })
    input.addEventListener("reject", (event) => {
      const value = (event as CustomEvent<{ value: Rejection[] }>).detail.value
      this.showRejected(value)
      this.dispatchEvent(new CustomEvent("reject", { detail: { value } }))
    })
    // UI SDK's file input fires `input` and `change` of its own: this element reports once.
    keepInputInside(input)
    // The list is one tab stop and its rows take the keys: Enter on a row that stopped sends
    // it again (Retry itself is out of the Tab order, like Remove).
    list.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return
      const item = event.target as ItemElement
      if (item.getAttribute("data-slot") !== "file-input-item" || !item.file) return
      if (this.#queue.retry(item.file)) event.preventDefault()
    })
    new MutationObserver(() => this.drawRows()).observe(list, { childList: true })
    this.replaceChildren(input)
    this.#dom = { input, dropzone, prompt, hint, choose, rejected, list }
  }

  private draw() {
    const { input, dropzone, prompt, hint, choose, list } = this.#dom!
    const words = this.words
    const label = this.getAttribute("label") ?? "Files"
    attr(input, "aria-label", label)
    attr(list, "aria-label", label)
    for (const name of ["accept", "max-size", "max-files", "disabled", "name"]) attr(input, name, this.getAttribute(name))
    // Several files unless `multiple="false"`, as React's.
    attr(input, "multiple", this.getAttribute("multiple") !== "false")
    prompt.textContent = words.prompt
    choose.textContent = words.choose
    hint.textContent = this.getAttribute("hint") ?? ""
    showIn(dropzone, hint, !!this.getAttribute("hint"), prompt.nextSibling)
    this.drawRows()
  }

  private showRejected(rejections: Rejection[]) {
    const { input, rejected, list } = this.#dom!
    const limits = { maxSize: Number(this.getAttribute("max-size")) || undefined, maxFiles: Number(this.getAttribute("max-files")) || undefined }
    rejected.replaceChildren(...rejections.map((rejection) => h("li", null, this.words.rejected(rejection, limits))))
    showIn(input, rejected, rejections.length > 0, list)
  }

  /** Fills in each row the list added, and shows each file's status. */
  private drawRows() {
    if (!this.#dom) return
    const items = [...this.#dom.list.querySelectorAll<ItemElement>(":scope > ui-file-input-item")]
    for (const [item, view] of this.#rows) {
      if (items.includes(item) && item.file === view.file) continue
      if (view.url) URL.revokeObjectURL(view.url)
      this.#rows.delete(item)
    }
    for (const item of items) {
      if (!item.file) continue
      const view = this.#rows.get(item) ?? this.makeRow(item, item.file)
      if (view) this.drawRow(view)
    }
  }

  private makeRow(item: ItemElement, file: File): RowView | undefined {
    const row = item.querySelector<HTMLElement>(":scope > .upload-row")
    const remove = row?.querySelector<HTMLElement>("ui-file-input-item-remove")
    if (!row || !remove) return
    const image = file.type.startsWith("image/")
    const url = image ? URL.createObjectURL(file) : undefined
    const preview = h("span", { class: "upload-preview", "aria-hidden": "true" }, url ? h("img", { src: url, alt: "" }) : iconElement(image ? "image" : "file"))
    const state = h("span", { class: "upload-state" })
    const hint = h("span", { class: "uiset-visually-hidden" })
    const progress = h("ui-progress", { class: "upload-progress" }, h("ui-progress-track", null, h("ui-progress-indicator")))
    const text = h(
      "div",
      { class: "upload-text" },
      h("span", { class: "upload-name" }, file.name),
      h("span", { class: "upload-status" }, formatFileSize(file.size), h("span", { "aria-hidden": "true" }, " · "), state, hint),
      progress,
    )
    const retry = ghost("retry")
    const cancel = ghost("close")
    retry.addEventListener("click", () => this.#queue.retry(file))
    cancel.addEventListener("click", () => this.#queue.cancel(file))
    row.prepend(preview, text)
    const view = { file, row, text, state, hint, progress, retry, cancel, remove, url }
    this.#rows.set(item, view)
    return view
  }

  private drawRow(view: RowView) {
    const words = this.words
    const current = this.#queue.item(view.file) ?? { file: view.file, status: "queued" as const, progress: 0 }
    const { status } = current
    const stopped = status === "failed" || status === "canceled"
    const name = view.file.name
    attr(view.row, "data-status", status)
    const text = status === "uploading" ? words.uploading(Math.round(current.progress * 100)) : status === "failed" ? words.failed(current.error ?? "") : words[status]
    if (view.state.textContent !== text) view.state.textContent = text
    view.hint.textContent = stopped ? ` ${words.retryHint}` : ""
    showIn(view.text, view.progress, status === "uploading")
    attr(view.progress, "value", String(Math.round(current.progress * 100)))
    attr(view.progress, "aria-label", words.progress(name))
    attr(view.retry.firstElementChild!, "aria-label", words.retry(name))
    attr(view.cancel.firstElementChild!, "aria-label", words.cancel(name))
    attr(view.remove.firstElementChild!, "aria-label", words.remove(name))
    // Retry once it stopped, Cancel while it's waiting or going up, Remove after. UI SDK's
    // remove part stays in the row (its item binds it), hidden while it doesn't apply.
    const going = status === "queued" || status === "uploading"
    const actions = [view.retry, view.cancel, view.remove]
    place(view.row, [stopped && view.retry, going && view.cancel, view.remove].filter((el): el is HTMLElement => !!el), (el) => actions.includes(el as HTMLElement))
    attr(view.remove.firstElementChild!, "data-upload-hidden", going)
  }
}

function defineUpload() {
  defineElement("uiset-upload", UISetUpload)
}

export { defineUpload, UISetUpload }
export type { UISetUploadEvents, UploadLabels }
