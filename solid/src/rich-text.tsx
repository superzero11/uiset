import { Dynamic, type JSX } from "@solidjs/web"
import { ariaKeyshortcuts } from "@ui-sdk/core"
import type { EditorChange, TextEditorAdapter } from "@ui-sdk/core/trigger-menu"
import { usePart, usePrimitive } from "@ui-sdk/solid/primitive"
import { createEffect, createMemo, createSignal, createUniqueId, For, onCleanup, onSettled, Show, untrack } from "solid-js"
import { Button } from "./button"
import { Field, FieldLabel, Input } from "./field"
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "./popover"
import { ScrollBox } from "./scroll-area"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./select"
import { Icon } from "./shell/icons"
import { Toggle } from "./toggle"
import { Toolbar, ToolbarButton, ToolbarSeparator } from "./toolbar"
import { TriggerMenu, TriggerMenuContent, TriggerMenuItem, TriggerMenuList, type TriggerMenuDataItem } from "./trigger-menu"
import {
  activeBlock,
  activeLink,
  block,
  blockLength,
  collapsed,
  counts,
  createState,
  deleteSelection,
  insertBlock,
  isMention,
  linkRange,
  markActive,
  sameDoc,
  sanitizeDoc,
  select,
  setLink,
  type Block,
  type Doc,
  type EditorState,
  type Inline,
  type Selection,
} from "../../registry/uiset/ui/rich-text/model"
import { blockOptions, blockOptionType, blockOptionValue, defaultCommands, listButtons, markButtons, type RichTextCommand as Command } from "../../registry/uiset/ui/rich-text/commands"
import { richTextPrimitive } from "../../registry/uiset/ui/rich-text/primitive"
import { applyMarkdown, fromMarkdown, toHTML, toMarkdown } from "../../registry/uiset/ui/rich-text/serialize"
import { blockLabel, createRichTextView, type RichTextMessages, type RichTextView } from "../../registry/uiset/ui/rich-text/view"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/rich-text/rich-text.css"

// A rich text editor on UI SDK, as React's: a toolbar (UI SDK's Toolbar, Toggles, Select and
// Popover), "/" to insert blocks and "@" to mention people (UI SDK's TriggerMenu, through an
// editor adapter), Markdown as you type, paste, undo, and a value agents read and set as
// Markdown. The editing itself is rich-text/view.ts and model.ts, shared with React and the
// web element.

type Person = { value: string; label: string }

type RichTextEditorProps = {
  /** The editor's name for people and agents, like "Release notes". */
  label: string
  /** Markdown, or a document from an earlier `onValueChange`. */
  defaultValue?: string | Doc
  /** A controlled document: pass back what `onValueChange` gives you. */
  value?: Doc
  onValueChange?: (doc: Doc) => void
  placeholder?: string
  readOnly?: boolean
  disabled?: boolean
  /** The toolbar above the text. On by default. */
  toolbar?: boolean
  /** People "@" can mention. Without them, "@" is just a character. */
  mentions?: Person[]
  /** What "/" offers; the defaults insert blocks. Pass [] to turn "/" off. */
  commands?: Command[]
  /** Mod+Enter, outside a to-do item. */
  onSubmit?: () => void
  /** Pasted, dropped or chosen images: upload them and say where they live. */
  uploadImage?: (file: File) => Promise<{ src: string; alt?: string } | null>
  /** For a form: the field name, and whether its value is HTML (default) or Markdown. */
  name?: string
  format?: "html" | "markdown"
  /** Shows a count; going over is allowed but marked, so nothing typed is lost. */
  maxLength?: number
  messages?: Partial<RichTextMessages>
  class?: string
}

function initialDoc(value: string | Doc | undefined): Doc {
  if (value === undefined) return createState().doc
  return typeof value === "string" ? fromMarkdown(value) : value
}

function RichTextEditor(props: RichTextEditorProps) {
  let root: HTMLDivElement | undefined
  const [view, setView] = createSignal<RichTextView | null>(null, { ownedWrite: true })
  const [state, setState] = createSignal<EditorState>(untrack(() => createState(initialDoc(props.value ?? props.defaultValue))))
  const [linkOpen, setLinkOpen] = createSignal(false)
  const locked = () => !!props.readOnly || !!props.disabled
  const markdown = createMemo(() => toMarkdown(state().doc))
  const countId = createUniqueId()
  const commands = () => props.commands ?? defaultCommands

  const handle = usePrimitive(richTextPrimitive, () => ({
    value: markdown(),
    readOnly: props.readOnly,
    disabled: props.disabled,
    // An agent's setValue, insert or clear: the editor takes the Markdown as one undo step.
    onValueChange: (next: string) => {
      const current = untrack(view)
      if (!current) return
      const doc = applyMarkdown(current.state.doc, next)
      if (doc !== current.state.doc) current.run(() => ({ doc, selection: null, stored: null }), "input")
    },
  }))

  // The "/" and "@" menus talk to the editor through this adapter. It exists from the first
  // render, so the text box keeps its place when the view arrives.
  const listeners = new Set<(change: EditorChange) => void>()
  const adapter: TextEditorAdapter = {
    get element() {
      return untrack(view)?.adapter.element ?? root ?? undefined
    },
    textBefore: (length) => untrack(view)?.adapter.textBefore(length) ?? null,
    selection: () => untrack(view)?.adapter.selection() ?? null,
    rectAt: (offset) => untrack(view)?.adapter.rectAt(offset) ?? null,
    replace: (range, content, options) => untrack(view)?.adapter.replace(range, content, options),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    composing: () => untrack(view)?.adapter.composing() ?? false,
    tokens: true,
    submit: (event) => untrack(view)?.adapter.submit?.(event),
  }

  // The view owns the text box's children; Solid renders none into it.
  onSettled(() => {
    if (!root) return
    const created = createRichTextView(root, {
      state: untrack(state),
      messages: untrack(() => props.messages),
      uploadImage: untrack(() => props.uploadImage) ? (file) => props.uploadImage?.(file) ?? Promise.resolve(null) : undefined,
      onSubmit: () => props.onSubmit?.(),
      onLinkRequest: () => setLinkOpen(true),
      onChange: (next, reason) => {
        setState(next)
        if (reason !== "selection") props.onValueChange?.(next.doc)
      },
    })
    const off = created.adapter.subscribe((change) => listeners.forEach((listener) => listener(change)))
    created.setReadOnly(untrack(locked))
    setView(created)
    return () => {
      off()
      created.destroy()
    }
  })

  createEffect(
    () => ({ view: view(), locked: locked() }),
    ({ view: current, locked: off }) => current?.setReadOnly(off),
  )

  // A controlled document from outside (a reset, a server copy) replaces what's shown.
  createEffect(
    () => ({ view: view(), value: props.value }),
    ({ view: current, value }) => {
      if (!current || value === undefined || sameDoc(value, current.state.doc)) return
      current.set(createState(value))
      setState(current.state)
    },
  )

  const count = createMemo(() => (props.maxLength ? counts(state().doc).characters : 0))

  const triggers = createMemo(() => [
    ...(commands().length ? [{ char: "/", boundary: "start" as const, items: commands().map(({ value, label }) => ({ value, label })) }] : []),
    ...(props.mentions?.length ? [{ char: "@", type: "mention", items: props.mentions }] : []),
  ])
  const described = createMemo(() => new Map(commands().map((c) => [c.value, c])))

  const editable = usePart(handle, "root", undefined, {
    ref: (el: HTMLDivElement) => {
      root = el
    },
    get "aria-label"() {
      return props.label
    },
    get "aria-describedby"() {
      return props.maxLength ? countId : undefined
    },
    get "aria-disabled"() {
      return props.disabled ? ("true" as const) : undefined
    },
    get "aria-placeholder"() {
      return props.placeholder
    },
    class: "rich-text-content",
  })

  return (
    <div class={["rich-text", props.class]} data-disabled={props.disabled ? "true" : undefined} data-readonly={props.readOnly ? "true" : undefined}>
      <Show when={props.toolbar !== false && !props.readOnly && view()}>
        {(shown) => (
          <RichTextToolbar
            view={shown()}
            state={state()}
            label={props.label}
            linkOpen={linkOpen()}
            onLinkOpenChange={setLinkOpen}
            uploadImage={props.uploadImage}
            disabled={!!props.disabled}
          />
        )}
      </Show>
      {/* Always the same tree: mentions arriving later never remount the text box. */}
      <TriggerMenu
        editor={adapter}
        triggers={triggers()}
        onSelect={(chosen: string, details) => {
          if (details.trigger !== "/") return
          // A command runs instead of inserting its name: the "/" and query go first.
          details.preventDefault()
          const command = described().get(chosen)
          const current = view()
          if (!command || !current) return
          current.run((s) => {
            const at = s.selection?.focus.block ?? 0
            const cleared = deleteSelection(select(s, { anchor: { block: at, offset: details.match.start }, focus: { block: at, offset: details.match.end } }))
            return command.run(cleared)
          })
        }}
      >
        {/* No fades: the caret often sits at the edge as you type. */}
        <ScrollBox data-frame="none" data-fades="none" class="rich-text-frame" viewport={{ class: "rich-text-scroller", role: "group", "aria-label": "Writing area" }}>
          {editable}
        </ScrollBox>
        {/* With nothing matching, the menu closes, so Enter makes a new line as usual. */}
        <TriggerMenuContent class="rich-text-menu">
          <TriggerMenuList>
            {(menu: { items: unknown[] }) => (
              <For each={menu.items as TriggerMenuDataItem[]}>
                {(item) => {
                  const command = () => described().get(item.value as string)
                  return (
                    <TriggerMenuItem value={item.value} label={item.label}>
                      <Show when={command()?.icon} fallback={<Show when={command()?.glyph}>{(glyph) => <span class="rich-text-menu-glyph" aria-hidden="true">{glyph()}</span>}</Show>}>
                        {(icon) => <Icon name={icon()} />}
                      </Show>
                      <span class="rich-text-menu-text">
                        <span>{item.label}</span>
                        <Show when={command()?.description}>{(description) => <span class="rich-text-menu-hint">{description()}</span>}</Show>
                      </span>
                    </TriggerMenuItem>
                  )
                }}
              </For>
            )}
          </TriggerMenuList>
        </TriggerMenuContent>
      </TriggerMenu>
      <Show when={props.maxLength}>
        {(max) => (
          <p id={countId} class="rich-text-count" data-over={count() > max() ? "true" : undefined}>
            {count() > max() ? `${count() - max()} over the limit of ${max()} characters` : `${count()} / ${max()} characters`}
          </p>
        )}
      </Show>
      <Show when={props.name}>{(name) => <input type="hidden" name={name()} value={props.format === "markdown" ? markdown() : toHTML(state().doc)} />}</Show>
    </div>
  )
}

/* ------------------------------------------------------------------ Toolbar */

/** Keeps the editor's selection while a toolbar control is pressed with a pointer. */
const keepSelection = (event: MouseEvent) => event.preventDefault()

function RichTextToolbar(props: {
  view: RichTextView
  state: EditorState
  label: string
  linkOpen: boolean
  onLinkOpenChange: (open: boolean) => void
  uploadImage?: (file: File) => Promise<{ src: string; alt?: string } | null>
  disabled: boolean
}) {
  const current = () => activeBlock(props.state)
  // With no caret in the text, it reads "Text", as a new line would be.
  const blockValue = () => blockOptionValue(current() ?? undefined)
  const back = () => requestAnimationFrame(() => props.view.focus())
  // Undo and redo follow the editor's state: each change is a new state.
  const canUndo = () => (props.state, props.view.canUndo())
  const canRedo = () => (props.state, props.view.canRedo())
  let file: HTMLInputElement | undefined

  return (
    // Agents format through the editor's Markdown; the toolbar acts on a person's selection.
    <Toolbar aria-label={`${props.label} formatting`} class="rich-text-toolbar" aria-disabled={props.disabled ? "true" : undefined} data-agent-hidden="">
      <Select
        value={blockValue()}
        onValueChange={(next) => {
          if (!next) return
          const { type, level } = blockOptionType(next as string)
          props.view.setBlock(type, level)
          back()
        }}
      >
        <SelectLabel class="uiset-visually-hidden">Block type</SelectLabel>
        {/* The trigger joins the toolbar's arrow keys, as its buttons do. */}
        <ToolbarButton render={(part) => <SelectTrigger {...part} class="rich-text-block-type" />}>
          <SelectValue />
        </ToolbarButton>
        <SelectContent>
          <For each={blockOptions}>{(option) => <SelectItem value={option.value}>{option.label}</SelectItem>}</For>
        </SelectContent>
      </Select>
      <ToolbarSeparator />
      <For each={markButtons}>
        {(b) => (
          <Toggle
            aria-label={b.label}
            aria-keyshortcuts={ariaKeyshortcuts(b.keys)}
            pressed={markActive(props.state, b.mark)}
            onPressedChange={(_, details) => {
              // The toggle shows the text's state, not its own: the change is the editor's to make.
              details.cancel()
              props.view.toggleMark(b.mark)
              back()
            }}
            onMouseDown={keepSelection}
          >
            <Icon name={b.icon} />
          </Toggle>
        )}
      </For>
      <LinkButton view={props.view} state={props.state} open={props.linkOpen} onOpenChange={props.onLinkOpenChange} />
      <ToolbarSeparator />
      <For each={listButtons}>
        {(b) => (
          <Toggle
            aria-label={b.label}
            pressed={current()?.type === b.type}
            onPressedChange={(_, details) => {
              details.cancel()
              props.view.setBlock(b.type)
              back()
            }}
            onMouseDown={keepSelection}
          >
            <Icon name={b.icon} />
          </Toggle>
        )}
      </For>
      <ToolbarButton
        aria-label="Insert divider"
        onClick={() => {
          props.view.run((s) => insertBlock(s, block("divider")))
          back()
        }}
        onMouseDown={keepSelection}
      >
        <Icon name="rule" />
      </ToolbarButton>
      <Show when={props.uploadImage}>
        {(upload) => (
          <>
            <ToolbarButton aria-label="Insert image" onClick={() => file?.click()} onMouseDown={keepSelection}>
              <Icon name="image" />
            </ToolbarButton>
            <input
              ref={(el) => (file = el)}
              type="file"
              accept="image/*"
              hidden
              onChange={async (event) => {
                const chosen = event.currentTarget.files?.[0]
                event.currentTarget.value = ""
                if (!chosen) return
                const uploaded = await upload()(chosen)
                if (uploaded) props.view.run((s) => insertBlock(s, block("image", [], { src: uploaded.src, alt: uploaded.alt ?? "" })))
                back()
              }}
            />
          </>
        )}
      </Show>
      <ToolbarSeparator />
      <ToolbarButton aria-label="Undo" disabled={!canUndo()} onClick={() => props.view.undo()} onMouseDown={keepSelection}>
        <Icon name="undo" />
      </ToolbarButton>
      <ToolbarButton aria-label="Redo" disabled={!canRedo()} onClick={() => props.view.redo()} onMouseDown={keepSelection}>
        <Icon name="redo" />
      </ToolbarButton>
    </Toolbar>
  )
}

/** The link button: a popover to add, change or remove the link under the caret or selection. */
function LinkButton(props: { view: RichTextView; state: EditorState; open: boolean; onOpenChange: (open: boolean) => void }) {
  const current = () => activeLink(props.state)
  let saved: Selection | null = null
  const [href, setHref] = createSignal("")
  const [problem, setProblem] = createSignal<string | null>(null)

  createEffect(
    () => ({ open: props.open, view: props.view }),
    ({ open, view }) => {
      if (!open) return
      // The selection the link applies to (the whole link when the caret is inside one), kept
      // while focus is in the popover. Read from the view, which is never behind a keystroke.
      const now = view.state
      saved = now.selection && collapsed(now.selection) ? (linkRange(now) ?? now.selection) : now.selection
      setHref(activeLink(now) ?? "")
      setProblem(null)
    },
  )

  const apply = (value: string | null) => {
    const selection = saved
    let refused = false
    props.view.run((s) => {
      const target = selection ? select(s, selection) : s
      const next = setLink(target, value)
      if (value && next === target) refused = true
      return next
    })
    if (refused) {
      setProblem("Use a web address (https://…), a mail address (mailto:…) or a path (/docs).")
      return
    }
    props.onOpenChange(false)
    requestAnimationFrame(() => props.view.focus())
  }

  return (
    <Popover
      open={props.open}
      onOpenChange={(next) => {
        props.onOpenChange(next)
        // Closed without saving (Escape, a click outside): back to the text, selection kept.
        if (!next) requestAnimationFrame(() => props.view.focus())
      }}
    >
      <PopoverTrigger
        render={(part) => (
          // Pressed while the caret is in a link; pressing it opens the popover, and the link is the editor's to change.
          <Toggle {...part} aria-label="Link" aria-keyshortcuts={ariaKeyshortcuts("mod+k")} pressed={!!current()} onPressedChange={(_, details) => details.cancel()} onMouseDown={keepSelection} />
        )}
      >
        <Icon name="link" />
      </PopoverTrigger>
      <PopoverContent class="rich-text-link" initialFocus="input">
        <PopoverTitle>{current() ? "Edit link" : "Add a link"}</PopoverTitle>
        <form
          class="rich-text-link-form"
          onSubmit={(event) => {
            event.preventDefault()
            apply(href().trim() || null)
          }}
        >
          <Field invalid={!!problem()}>
            <FieldLabel>Link address</FieldLabel>
            <Input value={href()} onValueChange={(next: string) => (setHref(next), setProblem(null))} placeholder="https://" inputmode="url" autocomplete="url" spellcheck={false} />
            <Show when={problem()}>
              <p class="rich-text-link-problem" role="alert">
                {problem()}
              </p>
            </Show>
          </Field>
          <div class="rich-text-link-actions">
            <Show when={current()}>
              <Button type="button" variant="ghost" onClick={() => apply(null)}>
                Remove link
              </Button>
            </Show>
            <Button type="submit">{current() ? "Save link" : "Add link"}</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

/* ------------------------------------------------------------------ Showing a document */

function runElement(run: Inline): JSX.Element {
  if (isMention(run)) return <span class="rich-text-mention" data-mention={run.id}>{`${run.trigger ?? "@"}${run.label}`}</span>
  const parts = run.text.split("\n").flatMap((part, i) => (i ? [<br />, part] : [part]))
  let node: JSX.Element = <>{parts}</>
  const m = run.marks ?? {}
  if (m.code) node = <code>{node}</code>
  if (m.bold) node = <strong>{node}</strong>
  if (m.italic) node = <em>{node}</em>
  if (m.underline) node = <u>{node}</u>
  if (m.strike) node = <s>{node}</s>
  if (m.link) node = <a href={m.link} rel="noopener noreferrer">{node}</a>
  return node
}

function blockElement(b: Block, number: number): JSX.Element {
  const inline = () => b.content.map(runElement)
  switch (b.type) {
    case "heading":
      return (
        <Dynamic component={`h${b.level ?? 1}`} class="rich-text-block rich-text-heading">
          {inline()}
        </Dynamic>
      )
    case "quote":
      return <blockquote class="rich-text-block rich-text-quote">{inline()}</blockquote>
    case "code":
      return (
        <pre class="rich-text-block rich-text-code" data-language={b.language}>
          <code>{b.content.map((r) => (isMention(r) ? r.label : r.text)).join("")}</code>
        </pre>
      )
    case "divider":
      return (
        <div class="rich-text-block rich-text-divider">
          <hr />
        </div>
      )
    case "image":
      return (
        <div class="rich-text-block rich-text-image">
          <img src={b.src} alt={b.alt ?? ""} />
        </div>
      )
    case "bullet":
    case "ordered":
    case "task":
      return (
        <li class={`rich-text-block rich-text-${b.type}`} aria-level={(b.indent ?? 0) + 1} data-indent={b.indent ?? 0} value={b.type === "ordered" ? number : undefined} data-checked={b.type === "task" ? String(!!b.checked) : undefined}>
          {b.type === "task" && <span class="rich-text-check" role="img" aria-label={b.checked ? "Done" : "Not done"} />}
          {inline()}
        </li>
      )
    default:
      return <p class="rich-text-block rich-text-paragraph">{blockLength(b) ? inline() : <br />}</p>
  }
}

/** A document as elements: lists gathered, each ordered item numbered within its level. */
function documentElements(doc: Doc): JSX.Element[] {
  const out: JSX.Element[] = []
  const counters: number[] = []
  let list: { type: string; items: JSX.Element[] } | null = null
  const flush = () => {
    if (!list) return
    const items = list.items
    out.push(list.type === "ordered" ? <ol class="rich-text-list rich-text-list-ordered">{items}</ol> : <ul class={`rich-text-list rich-text-list-${list.type}`}>{items}</ul>)
    list = null
  }
  for (const b of doc) {
    if (b.type === "bullet" || b.type === "ordered" || b.type === "task") {
      const level = b.indent ?? 0
      counters.length = level + 1
      counters[level] = b.type === "ordered" ? (counters[level] ?? 0) + 1 : 0
      if (!list || list.type !== b.type) {
        flush()
        list = { type: b.type, items: [] }
      }
      list.items.push(blockElement(b, counters[level]!))
      continue
    }
    counters.length = 0
    flush()
    out.push(blockElement(b, 0))
  }
  flush()
  return out
}

/** Shows a document read-only, with the editor's styles; rendered as elements, never as HTML strings. */
function RichTextContent(props: { value: string | Doc; class?: string }) {
  // Drawn again when the document changes: it's for reading, so nothing in it holds state.
  const elements = createMemo(() => documentElements(sanitizeDoc(typeof props.value === "string" ? fromMarkdown(props.value) : props.value)))
  return <div class={["rich-text-content", "rich-text-static", props.class]}>{elements()}</div>
}

export { blockLabel, defaultCommands as richTextCommands, RichTextContent, RichTextEditor }
export type { Command as RichTextCommand, Doc as RichTextDocument, RichTextEditorProps }
export { fromHTML, fromMarkdown, toHTML, toMarkdown, toText } from "../../registry/uiset/ui/rich-text/serialize"
