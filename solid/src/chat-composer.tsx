import type { JSX } from "@solidjs/web"
import { createInputHistory, isComposing } from "@ui-sdk/core"
import { FileInput, FileInputDropzone, FileInputItem, FileInputItemRemove, FileInputList, FileInputTrigger, formatFileSize } from "@ui-sdk/solid/file-input"
import { Meter, MeterIndicator, MeterTrack } from "@ui-sdk/solid/meter"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/solid/select"
import {
  TriggerMenu,
  TriggerMenuContent,
  TriggerMenuEmpty,
  TriggerMenuInput,
  TriggerMenuItem,
  TriggerMenuList,
  type TriggerMenuDataItem,
} from "@ui-sdk/solid/trigger-menu"
import { createMemo, createSignal, For, Show } from "solid-js"
import { Button } from "./button"
import { ChatIcon } from "./chat"
import "../../registry/uiset/ui/chat/chat.css"

type ComposerItem = { value: string; label: string; description?: string }
type Message = { text: string; files: File[] }

const paperclip = "M15.5 7.5l-6.8 6.8a2 2 0 0 0 2.8 2.8l7-7a4 4 0 0 0-5.6-5.6l-7 7a6 6 0 0 0 8.5 8.5l6.3-6.3"
const remove = "M6 6l12 12M18 6L6 18"

function ChatComposer(props: {
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
  tools?: JSX.Element
}) {
  let field: HTMLTextAreaElement | undefined
  // The textarea doesn't carry aria-expanded, so follow the menu through its callback.
  let menuOpen = false
  let sent: string[] = []
  const [hasText, setHasText] = createSignal(false)
  const [files, setFiles] = createSignal<File[]>([])

  const write = (value: string) => {
    if (!field) return
    field.value = value
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }

  const history = createInputHistory({
    entries: () => sent,
    read: () => field?.value ?? "",
    write: (value) => write(value as string),
  })

  const triggers = createMemo(() => [
    ...(props.commands?.length ? [{ char: "/", boundary: "start" as const, items: props.commands }] : []),
    ...(props.mentions?.length ? [{ char: "@", items: props.mentions }] : []),
  ])
  const describe = (value: string) => [...(props.commands ?? []), ...(props.mentions ?? [])].find((entry) => entry.value === value)?.description

  const submit = () => {
    const text = field?.value.trim() ?? ""
    const attached = files()
    if ((!text && !attached.length) || (props.running && !props.onQueue)) return
    if (text) sent = [...sent, text]
    history.reset()
    if (props.running) props.onQueue!({ text, files: attached })
    else props.onSubmit({ text, files: attached })
    write("")
    setFiles([])
  }

  const empty = () => !hasText() && !files().length

  const box = () => (
    <>
      <Show when={props.attachments}>
        <FileInputList aria-label="Attachments" class="chat-attachments">
          <FileInputItem class="chat-attachment">
            {({ file }: { file: File }) => (
              <>
                <span class="chat-attachment-name">{file.name}</span>
                <span class="chat-attachment-size">{formatFileSize(file.size)}</span>
                <FileInputItemRemove aria-label={`Remove ${file.name}`}>
                  <ChatIcon path={remove} />
                </FileInputItemRemove>
              </>
            )}
          </FileInputItem>
        </FileInputList>
      </Show>
      <TriggerMenu
        triggers={triggers()}
        onOpenChange={(open) => {
          menuOpen = open
        }}
      >
        <TriggerMenuInput
          ref={(el: HTMLTextAreaElement) => (field = el)}
          aria-label={props.label ?? "Message"}
          placeholder={props.placeholder ?? "Message…"}
          rows={1}
          class="chat-composer-input"
          onInput={(event: InputEvent & { currentTarget: HTMLTextAreaElement }) => setHasText(event.currentTarget.value.trim().length > 0)}
          onKeyDown={(event: KeyboardEvent) => {
            if (menuOpen) return
            if (history.keydown(event)) return
            if (event.key === "Enter" && !event.shiftKey && !isComposing(event)) {
              event.preventDefault()
              submit()
            }
          }}
        />
        <TriggerMenuContent class="chat-menu">
          <TriggerMenuEmpty>No matches</TriggerMenuEmpty>
          <TriggerMenuList>
            {(state: { items: unknown[] }) => (
              <For each={state.items as TriggerMenuDataItem<string>[]}>
                {(item) => (
                  <TriggerMenuItem value={item.value} label={item.label}>
                    <span class="chat-menu-label">{item.label}</span>
                    <Show when={describe(item.value)}>{(description) => <span class="chat-menu-hint">{description()}</span>}</Show>
                  </TriggerMenuItem>
                )}
              </For>
            )}
          </TriggerMenuList>
        </TriggerMenuContent>
      </TriggerMenu>
      <div class="chat-composer-toolbar">
        <Show when={props.attachments}>
          <FileInputTrigger aria-label="Attach files" class="chat-composer-attach">
            <ChatIcon path={paperclip} />
          </FileInputTrigger>
        </Show>
        {props.tools}
        <span class="chat-composer-spacer" />
        <Show when={props.running && props.onStop}>
          {(stop) => (
            <Button type="button" variant="outline" onClick={() => stop()()}>
              Stop
            </Button>
          )}
        </Show>
        <Show
          when={props.running && props.onQueue}
          fallback={
            <Show when={!(props.running && props.onStop)}>
              <Button type="submit" disabled={empty()}>
                Send
              </Button>
            </Show>
          }
        >
          <Button type="submit" disabled={empty()}>
            Queue
          </Button>
        </Show>
      </div>
    </>
  )

  return (
    <form
      class="chat-composer"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Show when={props.attachments} fallback={<div class="chat-composer-box">{box()}</div>}>
        {(attachments) => (
          <FileInput multiple value={files()} onValueChange={(next) => setFiles(next)} accept={attachments().accept} maxFiles={attachments().maxFiles} maxSize={attachments().maxSize}>
            <FileInputDropzone class="chat-composer-box">{box()}</FileInputDropzone>
          </FileInput>
        )}
      </Show>
    </form>
  )
}

type Model = { value: string; label: string; description?: string }

function ChatModelPicker(props: { models: Model[]; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; label?: string }) {
  return (
    <Select
      value={props.value}
      // Controlled or not: a default only when no value is given.
      defaultValue={props.value === undefined ? (props.defaultValue ?? props.models[0]?.value) : undefined}
      onValueChange={(next) => next && props.onValueChange?.(next as string)}
    >
      <SelectLabel class="chat-visually-hidden">{props.label ?? "Model"}</SelectLabel>
      <SelectTrigger class="chat-model-trigger">
        <SelectValue />
      </SelectTrigger>
      <SelectContent class="chat-model-list">
        <For each={props.models} keyed={(model) => model.value}>
          {(model) => (
            <SelectItem value={model().value} label={model().label}>
              <span class="chat-model-name">{model().label}</span>
              <Show when={model().description}>
                <span class="chat-model-description">{model().description}</span>
              </Show>
            </SelectItem>
          )}
        </For>
      </SelectContent>
    </Select>
  )
}

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })

function ChatUsage(props: { used: number; limit: number; label?: string; unit?: string }) {
  const text = () => `${compact.format(props.used)} of ${compact.format(props.limit)} ${props.unit ?? "tokens"}`
  const share = () => props.used / props.limit
  return (
    <Meter
      value={props.used}
      min={0}
      max={props.limit}
      aria-label={props.label ?? "Context used"}
      getValueLabel={() => text()}
      class="chat-usage"
      data-level={share() > 0.9 ? "high" : share() > 0.7 ? "medium" : undefined}
    >
      <MeterTrack>
        <MeterIndicator />
      </MeterTrack>
      <span class="chat-usage-text" aria-hidden="true">
        {text()}
      </span>
    </Meter>
  )
}

type QueuedMessage = { id: string; text: string }

/**
 * Messages a person wrote while the agent was still working, sent in turn when it's done:
 * "2 queued", each with Remove, and Send now for the first.
 */
function ChatQueue(props: { items: QueuedMessage[]; onRemove: (id: string) => void; onSendNow?: (id: string) => void; label?: string }) {
  return (
    <Show when={props.items.length > 0}>
      <section class="chat-queue" data-slot="chat-queue" aria-label={props.label ?? "Queued messages"}>
        <p class="chat-queue-head">
          {props.items.length} queued<span class="chat-queue-note">, sent when the answer is done</span>
        </p>
        <ol class="chat-queue-list">
          <For each={props.items} keyed={(item) => item.id}>
            {(item, index) => (
              <li>
                <span class="chat-queue-text">{item().text}</span>
                <Show when={index() === 0 && props.onSendNow}>
                  {(sendNow) => (
                    <Button variant="ghost" aria-label={`Send now: ${item().text}`} onClick={() => sendNow()(item().id)}>
                      Send now
                    </Button>
                  )}
                </Show>
                <Button variant="ghost" class="chat-queue-remove" aria-label={`Remove from queue: ${item().text}`} onClick={() => props.onRemove(item().id)}>
                  <ChatIcon path={remove} />
                </Button>
              </li>
            )}
          </For>
        </ol>
      </section>
    </Show>
  )
}

export { ChatComposer, ChatModelPicker, ChatQueue, ChatUsage }
export type { QueuedMessage as ChatQueuedMessage, ComposerItem as ChatComposerItem, Message as ChatComposerMessage, Model as ChatModel }
