"use client"

import { ariaKeyshortcuts } from "@ui-sdk/core"
import { usePart, usePrimitive } from "@ui-sdk/react/primitive"
import type { EditorChange, TextEditorAdapter } from "@ui-sdk/core/trigger-menu"
import { createElement, Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
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
  caret,
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
  setBlock,
  setLink,
  type Block,
  type Doc,
  type EditorState,
  type Inline,
  type Selection,
} from "./rich-text/model"
import { blockOptions, blockOptionType, blockOptionValue, defaultCommands, listButtons, markButtons, type RichTextCommand as Command } from "./rich-text/commands"
import { richTextPrimitive } from "./rich-text/primitive"
import { applyMarkdown, fromMarkdown, toHTML, toMarkdown } from "./rich-text/serialize"
import { blockLabel, createRichTextView, type RichTextMessages, type RichTextView } from "./rich-text/view"
import "./rich-text/rich-text.css"

// A rich text editor on UI SDK: a toolbar (UI SDK's Toolbar, Toggles, Select and Popover),
// "/" to insert blocks and "@" to mention people (UI SDK's TriggerMenu, through an editor
// adapter), Markdown as you type, paste from documents and the web, undo, and a value agents
// read and set as Markdown. The editing itself is rich-text/view.ts and model.ts, shared
// with the web element.

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
  className?: string
}

function initialDoc(value: string | Doc | undefined): Doc {
  if (value === undefined) return createState().doc
  return typeof value === "string" ? fromMarkdown(value) : value
}

function RichTextEditor({
  label,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  readOnly = false,
  disabled = false,
  toolbar = true,
  mentions,
  commands = defaultCommands,
  onSubmit,
  uploadImage,
  name,
  format = "html",
  maxLength,
  messages,
  className,
}: RichTextEditorProps) {
  const root = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<RichTextView | null>(null)
  const [view, setView] = useState<RichTextView | null>(null)
  const [state, setState] = useState<EditorState>(() => createState(initialDoc(value ?? defaultValue)))
  const [linkOpen, setLinkOpen] = useState(false)
  const latest = useRef({ state, onValueChange, onSubmit, uploadImage, messages, locked: readOnly || disabled })
  latest.current = { ...latest.current, onValueChange, onSubmit, uploadImage, messages, locked: readOnly || disabled }
  const markdown = useMemo(() => toMarkdown(state.doc), [state.doc])
  const countId = useId()

  const handle = usePrimitive(richTextPrimitive, {
    value: markdown,
    readOnly,
    disabled,
    // An agent's setValue, insert or clear: the editor takes the Markdown as one undo step.
    onValueChange: (next) => {
      const view = viewRef.current
      if (!view) return
      const doc = applyMarkdown(view.state.doc, next)
      if (doc !== view.state.doc) view.run(() => ({ doc, selection: null, stored: null }), "input")
    },
  })

  // The "/" and "@" menus talk to the editor through this adapter. It exists from the first
  // render, so the text box keeps its place in the tree when the view arrives.
  const adapterListeners = useRef(new Set<(change: EditorChange) => void>())
  const adapter = useMemo<TextEditorAdapter>(
    () => ({
      get element() {
        return viewRef.current?.adapter.element ?? root.current ?? undefined
      },
      textBefore: (length) => viewRef.current?.adapter.textBefore(length) ?? null,
      selection: () => viewRef.current?.adapter.selection() ?? null,
      rectAt: (offset) => viewRef.current?.adapter.rectAt(offset) ?? null,
      replace: (range, content, options) => viewRef.current?.adapter.replace(range, content, options),
      subscribe: (listener) => {
        adapterListeners.current.add(listener)
        return () => adapterListeners.current.delete(listener)
      },
      composing: () => viewRef.current?.adapter.composing() ?? false,
      tokens: true,
      submit: (event) => viewRef.current?.adapter.submit?.(event),
    }),
    [],
  )

  // The view owns the text box's children; React renders none into it.
  const attach = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const { uploadImage: upload } = latest.current
    const created = createRichTextView(el, {
      state: latest.current.state,
      messages: latest.current.messages,
      uploadImage: upload ? (file) => latest.current.uploadImage?.(file) ?? Promise.resolve(null) : undefined,
      onSubmit: () => latest.current.onSubmit?.(),
      onLinkRequest: () => setLinkOpen(true),
      onChange: (next, reason) => {
        latest.current.state = next
        setState(next)
        if (reason !== "selection") latest.current.onValueChange?.(next.doc)
      },
    })
    const off = created.adapter.subscribe((change) => adapterListeners.current.forEach((listener) => listener(change)))
    created.setReadOnly(latest.current.locked)
    viewRef.current = created
    setView(created)
    return () => {
      off()
      created.destroy()
      if (viewRef.current === created) viewRef.current = null
    }
  }, [])

  const setRoot = useCallback(
    (el: HTMLDivElement | null) => {
      root.current = el
      return attach(el)
    },
    [attach],
  )

  useEffect(() => view?.setReadOnly(readOnly || disabled), [view, readOnly, disabled])

  // A controlled document from outside (a reset, a server copy) replaces what's shown.
  useEffect(() => {
    if (!view || value === undefined || sameDoc(value, view.state.doc)) return
    view.set(createState(value))
    latest.current.state = view.state
    setState(view.state)
  }, [view, value])

  const count = useMemo(() => (maxLength ? counts(state.doc).characters : 0), [maxLength, state.doc])

  const editable = usePart(
    handle,
    "root",
    {},
    {
      ref: setRoot,
      "aria-label": label,
      "aria-describedby": maxLength ? countId : undefined,
      "aria-disabled": disabled || undefined,
      "aria-placeholder": placeholder,
      className: "rich-text-content",
    },
  )

  const triggers = [
    ...(commands.length ? [{ char: "/", boundary: "start" as const, items: commands.map(({ value, label }) => ({ value, label })) }] : []),
    ...(mentions?.length ? [{ char: "@", type: "mention", items: mentions }] : []),
  ]
  const described = new Map(commands.map((c) => [c.value, c]))

  return (
    <div className={["rich-text", className].filter(Boolean).join(" ")} data-disabled={disabled || undefined} data-readonly={readOnly || undefined}>
      {toolbar && view && !readOnly && (
        <RichTextToolbar view={view} state={state} label={label} linkOpen={linkOpen} onLinkOpenChange={setLinkOpen} uploadImage={uploadImage} disabled={disabled} />
      )}
      {/* Always the same tree: mentions arriving later never remount the text box. */}
      {(
        <TriggerMenu
          editor={adapter}
          triggers={triggers}
          onSelect={(chosen: string, details) => {
            if (details.trigger !== "/") return
            // A command runs instead of inserting its name: the "/" and query go first.
            details.preventDefault()
            const command = described.get(chosen)
            if (!command || !view) return
            view.run((s) => {
              const at = s.selection?.focus.block ?? 0
              const cleared = deleteSelection(select(s, { anchor: { block: at, offset: details.match.start }, focus: { block: at, offset: details.match.end } }))
              return command.run(cleared)
            })
          }}
        >
          {/* No fades: the caret often sits at the edge as you type. */}
          <ScrollBox data-frame="none" data-fades="none" className="rich-text-frame" viewport={{ className: "rich-text-scroller", role: "group", "aria-label": "Writing area" }}>
            {editable}
          </ScrollBox>
          {/* With nothing matching, the menu closes, so Enter makes a new line as usual. */}
          <TriggerMenuContent className="rich-text-menu">
            <TriggerMenuList>
              {(menu) =>
                (menu.items as TriggerMenuDataItem[]).map((item) => {
                  const command = described.get(item.value as string)
                  return (
                    <TriggerMenuItem key={item.value as string} value={item.value} label={item.label}>
                      {command?.icon ? (
                        <Icon name={command.icon} />
                      ) : command?.glyph ? (
                        <span className="rich-text-menu-glyph" aria-hidden="true">
                          {command.glyph}
                        </span>
                      ) : null}
                      <span className="rich-text-menu-text">
                        <span>{item.label}</span>
                        {command?.description && <span className="rich-text-menu-hint">{command.description}</span>}
                      </span>
                    </TriggerMenuItem>
                  )
                })
              }
            </TriggerMenuList>
          </TriggerMenuContent>
        </TriggerMenu>
      )}
      {maxLength ? (
        <p id={countId} className="rich-text-count" data-over={count > maxLength || undefined}>
          {count > maxLength ? `${count - maxLength} over the limit of ${maxLength} characters` : `${count} / ${maxLength} characters`}
        </p>
      ) : null}
      {name && <input type="hidden" name={name} value={format === "markdown" ? markdown : toHTML(state.doc)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ Toolbar */

/** Keeps the editor's selection while a toolbar control is pressed with a pointer. */
const keepSelection = { onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault() }

function RichTextToolbar({
  view,
  state,
  label,
  linkOpen,
  onLinkOpenChange,
  uploadImage,
  disabled,
}: {
  view: RichTextView
  state: EditorState
  label: string
  linkOpen: boolean
  onLinkOpenChange: (open: boolean) => void
  uploadImage?: (file: File) => Promise<{ src: string; alt?: string } | null>
  disabled: boolean
}) {
  const current = activeBlock(state)
  // With no caret in the text, it reads "Text", as a new line would be.
  const blockValue = blockOptionValue(current ?? undefined)
  const back = () => requestAnimationFrame(() => view.focus())
  const file = useRef<HTMLInputElement>(null)

  return (
    // Agents format through the editor's Markdown; the toolbar acts on a person's selection.
    <Toolbar aria-label={`${label} formatting`} className="rich-text-toolbar" aria-disabled={disabled || undefined} data-agent-hidden="">
      <Select
        value={blockValue}
        onValueChange={(next) => {
          if (!next) return
          const { type, level } = blockOptionType(next)
          view.setBlock(type, level)
          back()
        }}
      >
        <SelectLabel className="uiset-visually-hidden">Block type</SelectLabel>
        {/* The trigger joins the toolbar's arrow keys, as its buttons do. */}
        <ToolbarButton render={<SelectTrigger className="rich-text-block-type" />}>
          <SelectValue />
        </ToolbarButton>
        <SelectContent>
          {blockOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ToolbarSeparator />
      {markButtons.map((b) => (
        <Toggle
          key={b.mark}
          aria-label={b.label}
          aria-keyshortcuts={ariaKeyshortcuts(b.keys)}
          pressed={markActive(state, b.mark)}
          onPressedChange={() => {
            view.toggleMark(b.mark)
            back()
          }}
          {...keepSelection}
        >
          <Icon name={b.icon} />
        </Toggle>
      ))}
      <LinkButton view={view} state={state} open={linkOpen} onOpenChange={onLinkOpenChange} />
      <ToolbarSeparator />
      {listButtons.map((b) => (
        <Toggle
          key={b.type}
          aria-label={b.label}
          pressed={current?.type === b.type}
          onPressedChange={() => {
            view.setBlock(b.type)
            back()
          }}
          {...keepSelection}
        >
          <Icon name={b.icon} />
        </Toggle>
      ))}
      <ToolbarButton
        aria-label="Insert divider"
        onClick={() => {
          view.run((s) => insertBlock(s, block("divider")))
          back()
        }}
        {...keepSelection}
      >
        <Icon name="rule" />
      </ToolbarButton>
      {uploadImage && (
        <>
          <ToolbarButton aria-label="Insert image" onClick={() => file.current?.click()} {...keepSelection}>
            <Icon name="image" />
          </ToolbarButton>
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={async (event) => {
              const chosen = event.currentTarget.files?.[0]
              event.currentTarget.value = ""
              if (!chosen) return
              const uploaded = await uploadImage(chosen)
              if (uploaded) view.run((s) => insertBlock(s, block("image", [], { src: uploaded.src, alt: uploaded.alt ?? "" })))
              back()
            }}
          />
        </>
      )}
      <ToolbarSeparator />
      <ToolbarButton aria-label="Undo" disabled={!view.canUndo()} onClick={() => view.undo()} {...keepSelection}>
        <Icon name="undo" />
      </ToolbarButton>
      <ToolbarButton aria-label="Redo" disabled={!view.canRedo()} onClick={() => view.redo()} {...keepSelection}>
        <Icon name="redo" />
      </ToolbarButton>
    </Toolbar>
  )
}

/** The link button: a popover to add, change or remove the link under the caret or selection. */
function LinkButton({ view, state, open, onOpenChange }: { view: RichTextView; state: EditorState; open: boolean; onOpenChange: (open: boolean) => void }) {
  const current = activeLink(state)
  const saved = useRef<Selection | null>(null)
  const [href, setHref] = useState("")
  const [problem, setProblem] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    // The selection the link applies to (the whole link when the caret is inside one), kept
    // while focus is in the popover. Read from the view: React's copy can be a keystroke behind.
    const now = view.state
    saved.current = now.selection && collapsed(now.selection) ? (linkRange(now) ?? now.selection) : now.selection
    setHref(activeLink(now) ?? "")
    setProblem(null)
  }, [open, view])

  const apply = (value: string | null) => {
    const selection = saved.current
    let refused = false
    view.run((s) => {
      const target = selection ? select(s, selection) : s
      const next = setLink(target, value)
      if (value && next === target) refused = true
      return next
    })
    if (refused) {
      setProblem("Use a web address (https://…), a mail address (mailto:…) or a path (/docs).")
      return
    }
    onOpenChange(false)
    requestAnimationFrame(() => view.focus())
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        // Closed without saving (Escape, a click outside): back to the text, selection kept.
        if (!next) requestAnimationFrame(() => view.focus())
      }}
    >
      <PopoverTrigger render={<Toggle aria-label="Link" aria-keyshortcuts={ariaKeyshortcuts("mod+k")} pressed={!!current} {...keepSelection} />}>
        <Icon name="link" />
      </PopoverTrigger>
      <PopoverContent className="rich-text-link" initialFocus="input">
        <PopoverTitle>{current ? "Edit link" : "Add a link"}</PopoverTitle>
        <form
          className="rich-text-link-form"
          onSubmit={(event) => {
            event.preventDefault()
            apply(href.trim() || null)
          }}
        >
          <Field invalid={!!problem}>
            <FieldLabel>Link address</FieldLabel>
            <Input value={href} onValueChange={(next: string) => (setHref(next), setProblem(null))} placeholder="https://" inputMode="url" autoComplete="url" spellCheck={false} />
            {problem && <p className="rich-text-link-problem" role="alert">{problem}</p>}
          </Field>
          <div className="rich-text-link-actions">
            {current && (
              <Button type="button" variant="ghost" onClick={() => apply(null)}>
                Remove link
              </Button>
            )}
            <Button type="submit">{current ? "Save link" : "Add link"}</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}

/* ------------------------------------------------------------------ Showing a document */

function runElement(run: Inline, key: number): ReactNode {
  if (isMention(run)) return <span key={key} className="rich-text-mention" data-mention={run.id}>{`${run.trigger ?? "@"}${run.label}`}</span>
  const parts = run.text.split("\n").flatMap((part, i) => (i ? [<br key={`b${i}`} />, part] : [part]))
  let node: ReactNode = <Fragment key={key}>{parts}</Fragment>
  const m = run.marks ?? {}
  if (m.code) node = <code key={key}>{node}</code>
  if (m.bold) node = <strong key={key}>{node}</strong>
  if (m.italic) node = <em key={key}>{node}</em>
  if (m.underline) node = <u key={key}>{node}</u>
  if (m.strike) node = <s key={key}>{node}</s>
  if (m.link) node = <a key={key} href={m.link} rel="noopener noreferrer">{node}</a>
  return node
}

function blockElement(b: Block, number: number): ReactNode {
  const inline = b.content.map(runElement)
  switch (b.type) {
    case "heading":
      return createElement(`h${b.level ?? 1}`, { key: b.id, className: `rich-text-block rich-text-heading` }, inline)
    case "quote":
      return <blockquote key={b.id} className="rich-text-block rich-text-quote">{inline}</blockquote>
    case "code":
      return <pre key={b.id} className="rich-text-block rich-text-code" data-language={b.language}><code>{b.content.map((r) => (isMention(r) ? r.label : r.text)).join("")}</code></pre>
    case "divider":
      return <div key={b.id} className="rich-text-block rich-text-divider"><hr /></div>
    case "image":
      return <div key={b.id} className="rich-text-block rich-text-image"><img src={b.src} alt={b.alt ?? ""} /></div>
    case "bullet":
    case "ordered":
    case "task":
      return (
        <li key={b.id} className={`rich-text-block rich-text-${b.type}`} aria-level={(b.indent ?? 0) + 1} data-indent={b.indent ?? 0} value={b.type === "ordered" ? number : undefined} data-checked={b.type === "task" ? String(!!b.checked) : undefined}>
          {b.type === "task" && <span className="rich-text-check" role="img" aria-label={b.checked ? "Done" : "Not done"} />}
          {inline}
        </li>
      )
    default:
      return <p key={b.id} className="rich-text-block rich-text-paragraph">{blockLength(b) ? inline : <br />}</p>
  }
}

/** Shows a document read-only, with the editor's styles; rendered as React, never as HTML strings. */
function RichTextContent({ value, className }: { value: string | Doc; className?: string }) {
  const doc = sanitizeDoc(typeof value === "string" ? fromMarkdown(value) : value)
  const out: ReactNode[] = []
  const counters: number[] = []
  let list: { type: string; items: ReactNode[] } | null = null
  const flush = () => {
    if (!list) return
    out.push(createElement(list.type === "ordered" ? "ol" : "ul", { key: `l${out.length}`, className: `rich-text-list rich-text-list-${list.type}` }, list.items))
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
  return <div className={["rich-text-content", "rich-text-static", className].filter(Boolean).join(" ")}>{out}</div>
}

export { blockLabel, defaultCommands as richTextCommands, RichTextContent, RichTextEditor }
export type { Command as RichTextCommand, Doc as RichTextDocument, RichTextEditorProps }
export { fromHTML, fromMarkdown, toHTML, toMarkdown, toText } from "./rich-text/serialize"
