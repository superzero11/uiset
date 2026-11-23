"use client"

import { announce } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/react/primitive"
import {
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"
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
import { tagInput, type TagInputReason } from "./tag-input/tag-input"
import {
  addTags,
  defaultDelimiters,
  replaceTags,
  splitTags,
  tagMessages,
  takeEnded,
  type TagMessages,
  type TagRules,
} from "./tag-input/tags"
import "./shell/shell.css"
import "./tag-input/tag-input.css"

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
  description?: ReactNode
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
  className?: string
}

function TagInput({
  label,
  value,
  defaultValue,
  onValueChange,
  suggestions,
  description,
  placeholder,
  addOnBlur = true,
  name,
  form,
  disabled,
  readOnly,
  required,
  messages: messageOverrides,
  error: outside,
  onBlur,
  className,
  delimiters = defaultDelimiters,
  unique,
  max,
  maxLength,
  validate,
  transform,
}: TagInputProps) {
  const rules: TagRules = { delimiters, unique, max, maxLength, validate, transform }
  const messages = { ...tagMessages, ...messageOverrides }
  const [own, setOwn] = useState<string[]>(defaultValue ?? [])
  const tags = value ?? own
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)

  const commit = (next: string[], details: TagInputDetails) => {
    if (value === undefined) setOwn(next)
    onValueChange?.(next, details)
  }

  const refuse = (reason: string | null) => {
    setError(reason)
    if (reason) announce(reason)
  }

  /** Adds texts (or, while editing, puts the first in the edited tag's place); what's refused stays typed. */
  const add = (texts: string[], reason: TagInputReason, rest = "") => {
    const at = editing ?? undefined
    const change = addTags(tags, texts, rules, messages, at)
    if (
      change.tags.some((tag, index) => tag !== tags[index]) ||
      change.tags.length !== tags.length
    ) {
      commit(change.tags, { reason: at === undefined ? reason : "edit", source: "user" })
    }
    if (at !== undefined && !change.error) setEditing(null)
    refuse(change.error)
    const joiner = `${delimiters[0] ?? ","} `
    setQuery([change.refused, rest].filter(Boolean).join(joiner))
  }

  const startEdit = (index: number) => {
    if (disabled || readOnly) return
    focusEdit.current = true
    setEditing(index)
    setQuery(tags[index] ?? "")
    refuse(null)
  }

  // The field takes focus once it holds the tag's text, in the same task, selected to retype.
  const focusEdit = useRef(false)
  useLayoutEffect(() => {
    if (!focusEdit.current) return
    focusEdit.current = false
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const finishEdit = () => {
    if (editing === null) return
    if (!query.trim()) {
      commit(
        tags.filter((_, index) => index !== editing),
        { reason: "remove", source: "user" },
      )
      setEditing(null)
      setQuery("")
      refuse(null)
      return
    }
    add([query], "edit")
  }

  const cancelEdit = () => {
    setEditing(null)
    setQuery("")
    refuse(null)
  }

  const shown = suggestions?.filter(
    (suggestion) => !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()),
  )
  // The list opens only with something to show: suggestions left, or the "Enter adds" line.
  const canOpen = !!shown && (shown.length > 0 || !!query.trim())
  const problem = error ?? outside ?? null
  const count = max !== undefined ? messages.count(tags.length, max) : null

  // What an agent's setValue, add or remove asks for: the same rules as typing, and the
  // reason back when it's refused.
  const request = (next: string[]) => {
    const change = replaceTags(tags, next, rules, messages)
    if (change.error) return change.error
    commit(change.tags, { reason: "set", source: "agent" })
    refuse(null)
    return null
  }

  return (
    <parts.Root
      ref={rootRef}
      aria-label={label}
      value={tags}
      request={request}
      disabled={disabled}
      className={["tag-input", className].filter(Boolean).join(" ")}
      data-editing={editing !== null ? "" : undefined}
    >
      <Field
        invalid={problem ? true : undefined}
        disabled={disabled}
        className="tag-input-body"
        data-agent-hidden=""
      >
        <FieldLabel>{label}</FieldLabel>
        <Combobox
          multiple
          allowCustomValue
          keepQuery
          value={tags}
          onValueChange={(next, details) => {
            const list = next as string[]
            details.cancel()
            // Combobox reports a person's Enter as "programmatic"; the reason tells them apart.
            const person =
              details.reason === "input-change" || details.reason === "item-press"
            const source =
              details.source === "agent"
                ? "agent"
                : person || details.reason.endsWith("-press")
                  ? "user"
                  : "api"
            if (details.reason === "remove-press" || details.reason === "clear-press") {
              if (editing !== null) cancelEdit()
              commit(list, { reason: "remove", source })
              refuse(null)
            } else if (person && source === "user") {
              // An Enter or a pick. While editing, it's the edited tag's new text: the picked
              // suggestion, or the typed text (Combobox toggles off a tag whose name is typed again).
              const picked = list.filter((tag) => !tags.includes(tag))
              add(picked.length ? picked : [query], "add")
            } else {
              // A form reset or a controller.
              const change = replaceTags(tags, list, rules, messages)
              if (!change.error) commit(change.tags, { reason: "set", source })
              refuse(change.error)
            }
          }}
          query={query}
          onQueryChange={(next) => {
            if (readOnly) return
            const { ended, rest } = takeEnded(next, delimiters)
            if (ended.length) add(ended, "add", rest)
            else setQuery(next)
          }}
          open={open}
          onOpenChange={(next, details) => {
            if (next && !canOpen) return details.cancel()
            setOpen(next)
          }}
          maxSelected={max}
          name={name}
          form={form}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
        >
          <ComboboxChips className="tag-input-field">
            <ComboboxValue>
              {() =>
                tags.map((tag, index) => (
                  <ComboboxChip
                    key={tag}
                    value={tag}
                    className="tag-input-tag"
                    data-editing={editing === index ? "" : undefined}
                    onKeyDown={(event: KeyboardEvent) => {
                      if (event.key === "Enter" || event.key === "F2") {
                        event.preventDefault()
                        startEdit(index)
                      }
                    }}
                    onDoubleClick={() => startEdit(index)}
                  >
                    <span className="tag-input-text">{tag}</span>
                    {!readOnly && (
                      <ComboboxChipRemove
                        aria-label={messages.remove(tag)}
                        className="tag-input-remove"
                      >
                        <Icon name="close" />
                      </ComboboxChipRemove>
                    )}
                  </ComboboxChip>
                ))
              }
            </ComboboxValue>
            <ComboboxInput
              ref={inputRef}
              placeholder={tags.length ? undefined : placeholder}
              className="tag-input-input"
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (editing === null) return
                if (event.key === "Backspace" && !event.currentTarget.value) {
                  // Combobox removes the last tag here; while one is being edited, that's not what was meant.
                  event.preventDefault()
                } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  finishEdit()
                } else if (event.key === "Escape") {
                  cancelEdit()
                }
              }}
              onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
                // A single input drops line breaks from what's pasted, so split before it does.
                const pasted = event.clipboardData.getData("text")
                if (
                  !/[\r\n]/.test(pasted) &&
                  !delimiters.some((delimiter) => delimiter && pasted.includes(delimiter))
                )
                  return
                event.preventDefault()
                const input = event.currentTarget
                const before = query.slice(0, input.selectionStart ?? query.length)
                const after = query.slice(input.selectionEnd ?? query.length)
                add(splitTags(before + pasted + after, delimiters), "paste")
              }}
              onBlur={(event) => {
                if (rootRef.current?.contains(event.relatedTarget as Node | null)) return
                if (addOnBlur && editing !== null) finishEdit()
                else if (addOnBlur && query.trim()) add([query], "add")
                onBlur?.()
              }}
            />
          </ComboboxChips>
          {shown && (
            <ComboboxContent>
              <ComboboxEmpty>
                {(state) =>
                  state.empty && query.trim() ? `Enter adds “${query.trim()}”` : null
                }
              </ComboboxEmpty>
              <ComboboxList>
                {shown.map((suggestion) => (
                  <ComboboxItem key={suggestion} value={suggestion}>
                    {suggestion}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          )}
        </Combobox>
        {(description || count) && (
          <FieldDescription className="tag-input-description">
            {description}
            {description && count ? " " : null}
            {count && <span className="tag-input-count">{count}</span>}
          </FieldDescription>
        )}
        {problem && <FieldError match>{problem}</FieldError>}
      </Field>
    </parts.Root>
  )
}

export { TagInput }
export { addTags, normalizeTag, splitTags, tagMessages } from "./tag-input/tags"
export type { TagMessages, TagRules } from "./tag-input/tags"
export type { TagInputDetails, TagInputProps, TagInputReason }
