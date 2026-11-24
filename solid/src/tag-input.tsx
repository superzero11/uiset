import type { JSX } from "@solidjs/web"
import { announce } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/solid/primitive"
import { createSignal, For, onSettled, Show } from "solid-js"
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "./combobox"
import { Field, FieldDescription, FieldError, FieldLabel } from "./field"
import { Icon } from "./shell/icons"
import { tagInput, type TagInputReason } from "../../registry/uiset/ui/tag-input/tag-input"
import { addTags, defaultDelimiters, replaceTags, splitTags, tagMessages, takeEnded, type TagMessages, type TagRules } from "../../registry/uiset/ui/tag-input/tags"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/tag-input/tag-input.css"

const parts = createParts(tagInput, { root: "div" })

type TagInputDetails = { reason: TagInputReason; source: "user" | "agent" | "api" }

type TagInputProps = TagRules & {
  /** What the tags are, like "Topics". It names the field. */
  label: string
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (tags: string[], details: TagInputDetails) => void
  /** Tags to pick from, filtered as you type. Without them there's no list. */
  suggestions?: readonly string[]
  /** A line under the field, like "Separate them with commas." */
  description?: JSX.Element
  placeholder?: string
  /** Add what's typed when focus leaves the field. On by default. */
  addOnBlur?: boolean
  /** The name each tag submits under, as one form entry per tag. */
  name?: string
  form?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  messages?: Partial<TagMessages>
  /** A problem from outside, like a form's check. A tag the rules refuse shows its own reason first. */
  error?: string | null
  /** Runs when focus leaves the tag input, after what was typed is added. */
  onBlur?: () => void
  class?: string
}

function TagInput(props: TagInputProps) {
  const delimiters = () => props.delimiters ?? defaultDelimiters
  const rules = (): TagRules => ({ delimiters: delimiters(), unique: props.unique, max: props.max, maxLength: props.maxLength, validate: props.validate, transform: props.transform })
  const messages = () => ({ ...tagMessages, ...props.messages })
  const [own, setOwn] = createSignal<string[]>(() => props.defaultValue ?? [])
  const tags = () => props.value ?? own()
  const [query, setQuery] = createSignal("")
  const [editing, setEditing] = createSignal<number | null>(null)
  const [error, setError] = createSignal<string | null>(null)
  const [open, setOpen] = createSignal(false)
  let root: HTMLDivElement | undefined
  let input: HTMLInputElement | undefined

  const commit = (next: string[], details: TagInputDetails) => {
    if (props.value === undefined) setOwn(next)
    props.onValueChange?.(next, details)
  }

  const refuse = (reason: string | null) => {
    setError(reason)
    if (reason) announce(reason)
  }

  /** Adds texts (or, while editing, puts the first in the edited tag's place); what's refused stays typed. */
  const add = (texts: string[], reason: TagInputReason, rest = "") => {
    const at = editing() ?? undefined
    const before = tags()
    const change = addTags(before, texts, rules(), messages(), at)
    if (change.tags.some((tag, index) => tag !== before[index]) || change.tags.length !== before.length) {
      commit(change.tags, { reason: at === undefined ? reason : "edit", source: "user" })
    }
    if (at !== undefined && !change.error) setEditing(null)
    refuse(change.error)
    const joiner = `${delimiters()[0] ?? ","} `
    setQuery([change.refused, rest].filter(Boolean).join(joiner))
  }

  const startEdit = (index: number) => {
    if (props.disabled || props.readOnly) return
    setEditing(index)
    setQuery(tags()[index] ?? "")
    refuse(null)
    // The field takes focus once it holds the tag's text, selected to retype.
    onSettled(() => {
      input?.focus()
      input?.select()
    })
  }

  const finishEdit = () => {
    const at = editing()
    if (at === null) return
    if (!query().trim()) {
      commit(
        tags().filter((_, index) => index !== at),
        { reason: "remove", source: "user" },
      )
      setEditing(null)
      setQuery("")
      refuse(null)
      return
    }
    add([query()], "edit")
  }

  const cancelEdit = () => {
    setEditing(null)
    setQuery("")
    refuse(null)
  }

  const shown = () => props.suggestions?.filter((suggestion) => !tags().some((tag) => tag.toLowerCase() === suggestion.toLowerCase()))
  // The list opens only with something to show: suggestions left, or the "Enter adds" line.
  const canOpen = () => {
    const list = shown()
    return !!list && (list.length > 0 || !!query().trim())
  }
  const problem = () => error() ?? props.error ?? null
  const count = () => (props.max !== undefined ? messages().count(tags().length, props.max) : null)

  // What an agent's setValue, add or remove asks for: the same rules as typing, and the
  // reason back when it's refused.
  const request = (next: string[]) => {
    const change = replaceTags(tags(), next, rules(), messages())
    if (change.error) return change.error
    commit(change.tags, { reason: "set", source: "agent" })
    refuse(null)
    return null
  }

  return (
    <parts.Root
      ref={(el: HTMLDivElement) => {
        root = el
      }}
      aria-label={props.label}
      value={tags()}
      request={request}
      disabled={props.disabled}
      class={["tag-input", props.class]}
      data-editing={editing() !== null ? "" : undefined}
    >
      <Field invalid={problem() ? true : undefined} disabled={props.disabled} class="tag-input-body" data-agent-hidden="">
        <FieldLabel>{props.label}</FieldLabel>
        <Combobox
          multiple
          allowCustomValue
          keepQuery
          value={tags()}
          onValueChange={(next, details) => {
            const list = next as string[]
            details.cancel()
            // Combobox reports a person's Enter as "programmatic"; the reason tells them apart.
            const person = details.reason === "input-change" || details.reason === "item-press"
            const source = details.source === "agent" ? "agent" : person || details.reason.endsWith("-press") ? "user" : "api"
            if (details.reason === "remove-press" || details.reason === "clear-press") {
              if (editing() !== null) cancelEdit()
              commit(list, { reason: "remove", source })
              refuse(null)
            } else if (person && source === "user") {
              // An Enter or a pick. While editing, it's the edited tag's new text: the picked
              // suggestion, or the typed text (Combobox toggles off a tag whose name is typed again).
              const picked = list.filter((tag) => !tags().includes(tag))
              add(picked.length ? picked : [query()], "add")
            } else {
              // A form reset or a controller.
              const change = replaceTags(tags(), list, rules(), messages())
              if (!change.error) commit(change.tags, { reason: "set", source })
              refuse(change.error)
            }
          }}
          query={query()}
          onQueryChange={(next) => {
            if (props.readOnly) return
            const { ended, rest } = takeEnded(next, delimiters())
            if (ended.length) add(ended, "add", rest)
            else setQuery(next)
          }}
          open={open()}
          onOpenChange={(next, details) => {
            if (next && !canOpen()) return details.cancel()
            setOpen(next)
          }}
          maxSelected={props.max}
          name={props.name}
          form={props.form}
          disabled={props.disabled}
          readOnly={props.readOnly}
          required={props.required}
        >
          <ComboboxChips class="tag-input-field">
            <ComboboxValue>
              {() => (
                <For each={tags()}>
                  {(tag, index) => (
                    <ComboboxChip
                      value={tag}
                      class="tag-input-tag"
                      data-editing={editing() === index() ? "" : undefined}
                      onKeyDown={(event: KeyboardEvent) => {
                        if (event.key === "Enter" || event.key === "F2") {
                          event.preventDefault()
                          startEdit(index())
                        }
                      }}
                      onDblClick={() => startEdit(index())}
                    >
                      <span class="tag-input-text">{tag}</span>
                      <Show when={!props.readOnly}>
                        <ComboboxChipRemove aria-label={messages().remove(tag)} class="tag-input-remove">
                          <Icon name="close" />
                        </ComboboxChipRemove>
                      </Show>
                    </ComboboxChip>
                  )}
                </For>
              )}
            </ComboboxValue>
            <ComboboxInput
              ref={(el: HTMLInputElement) => {
                input = el
              }}
              placeholder={tags().length ? undefined : props.placeholder}
              class="tag-input-input"
              onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
                if (editing() === null) return
                if (event.key === "Backspace" && !event.currentTarget.value) {
                  // Combobox removes the last tag here; while one is being edited, that's not what was meant.
                  event.preventDefault()
                } else if (event.key === "Enter" && !event.isComposing) {
                  event.preventDefault()
                  finishEdit()
                } else if (event.key === "Escape") {
                  cancelEdit()
                }
              }}
              onPaste={(event: ClipboardEvent & { currentTarget: HTMLInputElement }) => {
                // A single input drops line breaks from what's pasted, so split before it does.
                const pasted = event.clipboardData?.getData("text") ?? ""
                if (!/[\r\n]/.test(pasted) && !delimiters().some((delimiter) => delimiter && pasted.includes(delimiter))) return
                event.preventDefault()
                const field = event.currentTarget
                const text = query()
                const before = text.slice(0, field.selectionStart ?? text.length)
                const after = text.slice(field.selectionEnd ?? text.length)
                add(splitTags(before + pasted + after, delimiters()), "paste")
              }}
              onBlur={(event: FocusEvent) => {
                if (root?.contains(event.relatedTarget as Node | null)) return
                const addOnBlur = props.addOnBlur !== false
                if (addOnBlur && editing() !== null) finishEdit()
                else if (addOnBlur && query().trim()) add([query()], "add")
                props.onBlur?.()
              }}
            />
          </ComboboxChips>
          <Show when={shown()}>
            {(list) => (
              <ComboboxContent>
                <ComboboxEmpty>{(state) => (state.empty && query().trim() ? `Enter adds “${query().trim()}”` : null)}</ComboboxEmpty>
                <ComboboxList>
                  <For each={list()}>{(suggestion) => <ComboboxItem value={suggestion}>{suggestion}</ComboboxItem>}</For>
                </ComboboxList>
              </ComboboxContent>
            )}
          </Show>
        </Combobox>
        <Show when={props.description || count()}>
          <FieldDescription class="tag-input-description">
            {props.description}
            {props.description && count() ? " " : null}
            <Show when={count()}>{(text) => <span class="tag-input-count">{text()}</span>}</Show>
          </FieldDescription>
        </Show>
        <Show when={problem()}>{(text) => <FieldError match>{text()}</FieldError>}</Show>
      </Field>
    </parts.Root>
  )
}

export { TagInput }
export { addTags, normalizeTag, splitTags, tagMessages } from "../../registry/uiset/ui/tag-input/tags"
export type { TagMessages, TagRules } from "../../registry/uiset/ui/tag-input/tags"
export type { TagInputDetails, TagInputProps, TagInputReason }
