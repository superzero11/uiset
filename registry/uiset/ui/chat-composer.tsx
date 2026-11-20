"use client"

import { createInputHistory, isComposing } from "@ui-sdk/core"
import {
  FileInput,
  FileInputDropzone,
  FileInputItem,
  FileInputItemRemove,
  FileInputList,
  FileInputTrigger,
  formatFileSize,
} from "@ui-sdk/react/file-input"
import { Meter, MeterIndicator, MeterTrack } from "@ui-sdk/react/meter"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@ui-sdk/react/select"
import {
  TriggerMenu,
  TriggerMenuContent,
  TriggerMenuEmpty,
  TriggerMenuInput,
  TriggerMenuItem,
  TriggerMenuList,
  type TriggerMenuDataItem,
} from "@ui-sdk/react/trigger-menu"
import { useMemo, useRef, useState, type ReactNode } from "react"
import { Button } from "./button"
import { ChatIcon } from "./chat"
import "./chat/chat.css"

type ComposerItem = { value: string; label: string; description?: string }
type Message = { text: string; files: File[] }

const paperclip =
  "M15.5 7.5l-6.8 6.8a2 2 0 0 0 2.8 2.8l7-7a4 4 0 0 0-5.6-5.6l-7 7a6 6 0 0 0 8.5 8.5l6.3-6.3"
const remove = "M6 6l12 12M18 6L6 18"

function ChatComposer({
  onSubmit,
  running = false,
  onStop,
  onQueue,
  label = "Message",
  placeholder = "Message…",
  commands,
  mentions,
  attachments = false,
  tools,
}: {
  onSubmit: (message: Message) => void
  running?: boolean
  onStop?: () => void
  /** While `running`, Enter and Queue hand the message here instead of refusing it; show
   *  them with `ChatQueue` and send them when the answer is done. */
  onQueue?: (message: Message) => void
  label?: string
  placeholder?: string
  commands?: ComposerItem[]
  mentions?: ComposerItem[]
  attachments?: false | { accept?: string; maxFiles?: number; maxSize?: number }
  tools?: ReactNode
}) {
  const field = useRef<HTMLTextAreaElement>(null)
  // The textarea doesn't carry aria-expanded, so follow the menu through its callback.
  const menuOpen = useRef(false)
  const sent = useRef<string[]>([])
  const [hasText, setHasText] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const write = (value: string) => {
    const el = field.current
    if (!el) return
    el.value = value
    el.dispatchEvent(new Event("input", { bubbles: true }))
  }

  const history = useMemo(
    () =>
      createInputHistory({
        entries: () => sent.current,
        read: () => field.current?.value ?? "",
        write: (value) => write(value as string),
      }),
    [],
  )

  const triggers = useMemo(
    () => [
      ...(commands?.length
        ? [{ char: "/", boundary: "start" as const, items: commands }]
        : []),
      ...(mentions?.length ? [{ char: "@", items: mentions }] : []),
    ],
    [commands, mentions],
  )

  const submit = () => {
    const text = field.current?.value.trim() ?? ""
    if ((!text && !files.length) || (running && !onQueue)) return
    if (text) sent.current = [...sent.current, text]
    history.reset()
    if (running) onQueue!({ text, files })
    else onSubmit({ text, files })
    write("")
    setFiles([])
  }

  const box = (
    <>
      {attachments && (
        <FileInputList aria-label="Attachments" className="chat-attachments">
          <FileInputItem className="chat-attachment">
            {({ file }) => (
              <>
                <span className="chat-attachment-name">{file.name}</span>
                <span className="chat-attachment-size">{formatFileSize(file.size)}</span>
                <FileInputItemRemove aria-label={`Remove ${file.name}`}>
                  <ChatIcon path={remove} />
                </FileInputItemRemove>
              </>
            )}
          </FileInputItem>
        </FileInputList>
      )}
      <TriggerMenu
        triggers={triggers}
        onOpenChange={(open) => {
          menuOpen.current = open
        }}
      >
        <TriggerMenuInput
          ref={field}
          aria-label={label}
          placeholder={placeholder}
          rows={1}
          className="chat-composer-input"
          onInput={(event) => setHasText(event.currentTarget.value.trim().length > 0)}
          onKeyDown={(event) => {
            if (menuOpen.current) return
            if (history.keydown(event.nativeEvent)) return
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !isComposing(event.nativeEvent)
            ) {
              event.preventDefault()
              submit()
            }
          }}
        />
        <TriggerMenuContent className="chat-menu">
          <TriggerMenuEmpty>No matches</TriggerMenuEmpty>
          <TriggerMenuList>
            {(state) =>
              (state.items as TriggerMenuDataItem<string>[]).map((item) => {
                const description = [...(commands ?? []), ...(mentions ?? [])].find(
                  (entry) => entry.value === item.value,
                )?.description
                return (
                  <TriggerMenuItem key={item.value} value={item.value} label={item.label}>
                    <span className="chat-menu-label">{item.label}</span>
                    {description && <span className="chat-menu-hint">{description}</span>}
                  </TriggerMenuItem>
                )
              })
            }
          </TriggerMenuList>
        </TriggerMenuContent>
      </TriggerMenu>
      <div className="chat-composer-toolbar">
        {attachments && (
          <FileInputTrigger aria-label="Attach files" className="chat-composer-attach">
            <ChatIcon path={paperclip} />
          </FileInputTrigger>
        )}
        {tools}
        <span className="chat-composer-spacer" />
        {running && onStop && (
          <Button type="button" variant="outline" onClick={onStop}>
            Stop
          </Button>
        )}
        {running && onQueue ? (
          <Button type="submit" disabled={!hasText && !files.length}>
            Queue
          </Button>
        ) : (
          !(running && onStop) && (
            <Button type="submit" disabled={!hasText && !files.length}>
              Send
            </Button>
          )
        )}
      </div>
    </>
  )

  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {attachments ? (
        <FileInput
          multiple
          value={files}
          onValueChange={setFiles}
          accept={attachments.accept}
          maxFiles={attachments.maxFiles}
          maxSize={attachments.maxSize}
        >
          <FileInputDropzone className="chat-composer-box">{box}</FileInputDropzone>
        </FileInput>
      ) : (
        <div className="chat-composer-box">{box}</div>
      )}
    </form>
  )
}

type Model = { value: string; label: string; description?: string }

function ChatModelPicker({
  models,
  value,
  defaultValue,
  onValueChange,
  label = "Model",
}: {
  models: Model[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  label?: string
}) {
  return (
    <Select
      value={value}
      // Controlled or not: a default only when no value is given.
      defaultValue={value === undefined ? (defaultValue ?? models[0]?.value) : undefined}
      onValueChange={(next) => next && onValueChange?.(next as string)}
    >
      <SelectLabel className="chat-visually-hidden">{label}</SelectLabel>
      <SelectTrigger className="chat-model-trigger">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="chat-model-list">
        {models.map((model) => (
          <SelectItem key={model.value} value={model.value} label={model.label}>
            <span className="chat-model-name">{model.label}</span>
            {model.description && (
              <span className="chat-model-description">{model.description}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
})

function ChatUsage({
  used,
  limit,
  label = "Context used",
  unit = "tokens",
}: {
  used: number
  limit: number
  label?: string
  unit?: string
}) {
  const text = `${compact.format(used)} of ${compact.format(limit)} ${unit}`
  return (
    <Meter
      value={used}
      min={0}
      max={limit}
      aria-label={label}
      getValueLabel={() => text}
      className="chat-usage"
      data-level={used / limit > 0.9 ? "high" : used / limit > 0.7 ? "medium" : undefined}
    >
      <MeterTrack>
        <MeterIndicator />
      </MeterTrack>
      <span className="chat-usage-text" aria-hidden="true">
        {text}
      </span>
    </Meter>
  )
}

type QueuedMessage = { id: string; text: string }

/**
 * Messages a person wrote while the agent was still working, sent in turn when it's done:
 * "2 queued", each with Remove, and Send now for the first.
 */
function ChatQueue({
  items,
  onRemove,
  onSendNow,
  label = "Queued messages",
}: {
  items: QueuedMessage[]
  onRemove: (id: string) => void
  onSendNow?: (id: string) => void
  label?: string
}) {
  if (!items.length) return null
  return (
    <section className="chat-queue" data-slot="chat-queue" aria-label={label}>
      <p className="chat-queue-head">
        {items.length} queued<span className="chat-queue-note">, sent when the answer is done</span>
      </p>
      <ol className="chat-queue-list">
        {items.map((item, index) => (
          <li key={item.id}>
            <span className="chat-queue-text">{item.text}</span>
            {index === 0 && onSendNow && (
              <Button variant="ghost" aria-label={`Send now: ${item.text}`} onClick={() => onSendNow(item.id)}>
                Send now
              </Button>
            )}
            <Button variant="ghost" className="chat-queue-remove" aria-label={`Remove from queue: ${item.text}`} onClick={() => onRemove(item.id)}>
              <ChatIcon path={remove} />
            </Button>
          </li>
        ))}
      </ol>
    </section>
  )
}

export { ChatComposer, ChatModelPicker, ChatQueue, ChatUsage }
export type {
  QueuedMessage as ChatQueuedMessage,
  ComposerItem as ChatComposerItem,
  Message as ChatComposerMessage,
  Model as ChatModel,
}
