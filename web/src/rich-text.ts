// The rich text editor for Web Components: <uiset-rich-text> builds the same editor as
// React's RichTextEditor from UI SDK's own elements (toolbar, toggles, select, popover,
// trigger menu) around <uiset-rich-text-area>, the editing surface, which is the rich-text
// primitive made an element with createParts, so agents read and write it as Markdown.
// <uiset-rich-text-content> shows saved text read-only with the same styles.
import { ariaKeyshortcuts } from "@ui-sdk/core"
import { createParts } from "@ui-sdk/web"
import "@ui-sdk/web/button"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/popover"
import "@ui-sdk/web/select"
import "@ui-sdk/web/toggle"
import "@ui-sdk/web/toolbar"
import "@ui-sdk/web/trigger-menu"
import { blockOptions, blockOptionType, blockOptionValue, commandStart, defaultCommands, listButtons, markButtons, type RichTextCommand } from "@/registry/uiset/ui/rich-text/commands"
import { activeBlock, activeLink, block, collapsed, counts, createState, deleteSelection, insertBlock, linkRange, markActive, sameDoc, select, setLink, type Doc, type EditorState, type Selection } from "@/registry/uiset/ui/rich-text/model"
import { richTextPrimitive } from "@/registry/uiset/ui/rich-text/primitive"
import "@/registry/uiset/ui/rich-text/rich-text.css"
import { applyMarkdown, fromMarkdown, toHTML, toMarkdown } from "@/registry/uiset/ui/rich-text/serialize"
import { createRichTextView, renderDocument, type RichTextMessages, type RichTextView } from "@/registry/uiset/ui/rich-text/view"
import { iconElement } from "@/registry/uiset/ui/shell/icon-paths"
import "@/registry/uiset/ui/shell/shell.css"
import { attr, defineElement, ElementBase, Evented, h, isOn, keepInputInside, reportInput, uid, upgradeProperties } from "./dom"
import "./rich-text.css"

type Person = { value: string; label: string }
type UploadImage = (file: File) => Promise<{ src: string; alt?: string } | null>

type AreaElement = HTMLElement & {
  value?: string
  readOnly?: boolean
  disabled?: boolean
}

type MenuElement = HTMLElement & { triggers?: unknown; editor?: unknown }
type ToggleElement = HTMLElement & { pressed?: boolean }
type SelectElement = HTMLElement & { value?: string | null }
type PopoverElement = HTMLElement & { open?: boolean; api?: { open: (options?: { anchor?: Element }) => Promise<unknown> } }

const keepSelection = (event: Event) => event.preventDefault()

/**
 * <uiset-rich-text label="Release notes" placeholder="…" value="## Markdown" name="notes"
 * format="html|markdown" max-length="2000" readonly disabled toolbar="false">
 *
 * Properties: `value` (Markdown), `doc` (the document), `mentions` ({ value, label }[] for
 * "@"), `commands` (what "/" offers; [] turns it off), `uploadImage(file)` (pasted, dropped
 * and chosen images), `messages` (announcements, for other languages).
 * Events: `valuechange` with `{ value, doc }` as the text changes (not for caret moves),
 * `submit` on Mod+Enter outside a to-do.
 */
/** What `<uiset-rich-text>` fires. */
type UISetRichTextEvents = {
  /** An edit (not a caret move): `value` is Markdown, `doc` the document. */
  valuechange: CustomEvent<{ value: string; doc: Doc }>
  /** Mod+Enter outside a list. */
  submit: CustomEvent<null>
}

class UISetRichText extends Evented<UISetRichTextEvents>() {
  static observedAttributes = ["label", "placeholder", "readonly", "disabled", "max-length", "name", "format", "toolbar", "value"]
  #view?: RichTextView
  #state: EditorState = createState()
  #mentions: Person[] = []
  #commands: RichTextCommand[] = defaultCommands
  #dom?: {
    root: HTMLElement
    area: AreaElement
    menu: MenuElement
    list: HTMLElement
    toolbar: HTMLElement | null
    blockType: SelectElement | null
    marks: Map<string, ToggleElement>
    lists: Map<string, ToggleElement>
    link: { toggle: ToggleElement; popover: PopoverElement; button: HTMLButtonElement; title: HTMLElement; input: HTMLInputElement; problem: HTMLElement; remove: HTMLElement; save: HTMLButtonElement } | null
    undo: HTMLButtonElement | null
    redo: HTMLButtonElement | null
    count: HTMLElement
    input: HTMLInputElement
  }
  #linkRange: Selection | null = null
  #uploadImage?: UploadImage
  #messages?: Partial<RichTextMessages>
  #started = false

  /** Takes pasted, dropped and chosen images: upload one and say where it lives. */
  get uploadImage() {
    return this.#uploadImage
  }
  set uploadImage(upload: UploadImage | undefined) {
    this.#uploadImage = upload
    this.rebuild()
  }

  /** What's announced (marks and blocks turning on and off), for other languages. */
  get messages() {
    return this.#messages
  }
  set messages(messages: Partial<RichTextMessages> | undefined) {
    this.#messages = messages
    this.rebuild()
  }

  /** The text as Markdown. */
  get value(): string {
    return toMarkdown(this.#state.doc)
  }
  set value(markdown: string) {
    this.doc = fromMarkdown(String(markdown ?? ""))
  }

  get doc(): Doc {
    return this.#state.doc
  }
  set doc(doc: Doc) {
    if (sameDoc(doc, this.#state.doc)) return
    if (this.#view) {
      this.#view.set(createState(doc))
      this.#state = this.#view.state
      this.sync()
    } else this.#state = createState(doc)
  }

  get mentions() {
    return this.#mentions
  }
  set mentions(people: Person[]) {
    this.#mentions = people ?? []
    this.syncTriggers()
  }

  get commands() {
    return this.#commands
  }
  set commands(commands: RichTextCommand[]) {
    this.#commands = commands ?? []
    this.syncTriggers()
  }

  /** Names the editing surface. An attribute and a property. */
  get label(): string {
    return this.getAttribute("label") ?? "Text"
  }
  set label(value: string | null) {
    attr(this, "label", value)
  }
  private get locked() {
    return isOn(this, "readonly") || isOn(this, "disabled")
  }

  connectedCallback() {
    if (!this.#started) {
      // The value attribute is the starting text; after that the editor's own text is kept.
      this.#started = true
      if (this.hasAttribute("value")) this.#state = createState(fromMarkdown(this.getAttribute("value") ?? ""))
      upgradeProperties(this, ["value", "doc", "mentions", "commands", "uploadImage", "messages"])
    }
    if (!this.#dom) this.build()
    this.sync()
  }

  /** A removed editor lets go of the page (its selection listener); put back, it's rebuilt. */
  disconnectedCallback() {
    this.#view?.destroy()
    this.#view = undefined
    this.#dom = undefined
  }

  attributeChangedCallback(name: string, before: string | null, after: string | null) {
    if (!this.#dom) return
    if (name === "value") {
      if (after !== before && after !== null) this.value = after
      return
    }
    if (name === "toolbar") this.rebuild()
    this.sync()
  }

  /** Builds the editor again around the same text (the toolbar or image upload changed). */
  private rebuild() {
    if (!this.#dom) return
    this.#view?.destroy()
    this.#view = undefined
    this.#dom = undefined
    this.build()
    this.sync()
  }

  /** Focuses the text. */
  override focus() {
    this.#view?.focus()
  }

  undo() {
    this.#view?.undo()
  }
  redo() {
    this.#view?.redo()
  }

  /* ------------------------------------------------------------ building */

  private build() {
    const area = h("uiset-rich-text-area") as AreaElement
    const list = h("ui-trigger-menu-list")
    // With nothing matching, the menu closes, so Enter makes a new line as usual.
    const menu = h("ui-trigger-menu", null, area, h("ui-trigger-menu-content", { class: "rich-text-menu" }, list)) as MenuElement
    const countId = uid("rich-text-count")
    const count = h("p", { class: "rich-text-count", id: countId })
    const input = h("input", { type: "hidden" }) as HTMLInputElement
    const toolbar = this.getAttribute("toolbar") === "false" ? null : this.buildToolbar()
    const root = h("div", { class: "rich-text" }, toolbar?.el ?? null, menu, count, input)
    keepInputInside(root)
    this.replaceChildren(root)
    this.#dom = { root, area, menu, list, count, input, toolbar: toolbar?.el ?? null, blockType: toolbar?.blockType ?? null, marks: toolbar?.marks ?? new Map(), lists: toolbar?.lists ?? new Map(), link: toolbar?.link ?? null, undo: toolbar?.undo ?? null, redo: toolbar?.redo ?? null }

    // Agents: the primitive asks to change the text; the editor takes it as one undo step.
    area.addEventListener("valuechange", (event) => {
      const next = String((event as CustomEvent<{ value: string }>).detail.value ?? "")
      const view = this.#view
      if (!view) return
      const doc = applyMarkdown(view.state.doc, next)
      if (doc !== view.state.doc) view.run(() => ({ doc, selection: null, stored: null }), "input")
    })

    const view = createRichTextView(area, {
      state: this.#state,
      messages: this.#messages,
      uploadImage: this.#uploadImage ? (file) => this.#uploadImage?.(file) ?? Promise.resolve(null) : undefined,
      onSubmit: () => this.dispatchEvent(new CustomEvent("submit")),
      onLinkRequest: () => this.openLink(),
      onChange: (next, reason) => {
        this.#state = next
        this.sync()
        if (reason === "selection") return
        this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: toMarkdown(next.doc), doc: next.doc } }))
        reportInput(this, false)
      },
    })
    this.#view = view
    menu.editor = view.adapter
    attr(area, "aria-describedby", countId)

    // "/" runs its command in place of inserting the command's name; "@" inserts a mention.
    menu.addEventListener("itemselect", (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail
      const command = this.#commands.find((c) => c.value === detail.value)
      const s = view.state
      if (!command || !s.selection || !collapsed(s.selection)) return
      const at = s.selection.focus
      const text = s.doc[at.block]?.content.map((r) => ("text" in r ? r.text : "￼")).join("") ?? ""
      if (text[commandStart(text, at.offset)] !== "/") return
      event.preventDefault()
      view.run((state) => command.run(deleteSelection(select(state, { anchor: { block: at.block, offset: commandStart(text, at.offset) }, focus: at }))))
    })
    // Each item shows its icon and description, as in React.
    new MutationObserver(() => this.describeItems()).observe(list, { childList: true, subtree: true })
    this.syncTriggers()
  }

  private buildToolbar() {
    const marks = new Map<string, ToggleElement>()
    const lists = new Map<string, ToggleElement>()
    const back = () => requestAnimationFrame(() => this.#view?.focus())

    const toggle = (label: string, icon: Parameters<typeof iconElement>[0], run: () => void, keys?: string) => {
      const button = h("button", { type: "button", "aria-label": label, "aria-keyshortcuts": keys ? ariaKeyshortcuts(keys) : null, onmousedown: keepSelection }, iconElement(icon))
      const el = h("ui-toggle", null, button) as ToggleElement
      el.addEventListener("pressedchange", (event) => {
        // The toggle shows the text's state, not its own: the change is the editor's to make.
        event.preventDefault()
        run()
        queueMicrotask(() => this.sync())
        back()
      })
      return el
    }
    const tool = (label: string, icon: Parameters<typeof iconElement>[0], run: () => void) => {
      const button = h("button", { type: "button", "aria-label": label, onmousedown: keepSelection, onclick: () => (run(), back()) }, iconElement(icon)) as HTMLButtonElement
      return { el: h("ui-toolbar-button", null, button), button }
    }

    // The block type, a select that joins the toolbar's arrow keys.
    const blockLabel = h("ui-select-label", { class: "uiset-visually-hidden" }, "Block type")
    const blockType = h(
      "ui-select",
      { class: "rich-text-block-select" },
      blockLabel,
      h("ui-toolbar-button", null, h("ui-select-trigger", null, h("button", { type: "button", class: "rich-text-block-type" }, h("ui-select-value")))),
      h("ui-select-content", null, ...blockOptions.map((o) => h("ui-select-item", { value: o.value }, o.label))),
    ) as SelectElement
    blockType.addEventListener("valuechange", (event) => {
      const next = (event as CustomEvent<{ value: string | null }>).detail.value
      if (!next || next === blockOptionValue(activeBlock(this.#state) ?? undefined)) return
      const { type, level } = blockOptionType(next)
      this.#view?.setBlock(type, level)
      back()
    })

    for (const b of markButtons) marks.set(b.mark, toggle(b.label, b.icon, () => this.#view?.toggleMark(b.mark), b.keys))
    for (const b of listButtons) lists.set(b.type, toggle(b.label, b.icon, () => this.#view?.setBlock(b.type)))
    const divider = tool("Insert divider", "rule", () => this.#view?.run((s) => insertBlock(s, block("divider"))))
    const undo = tool("Undo", "undo", () => this.#view?.undo())
    const redo = tool("Redo", "redo", () => this.#view?.redo())
    let image: HTMLElement | null = null
    if (this.uploadImage) {
      const file = h("input", { type: "file", accept: "image/*", hidden: true }) as HTMLInputElement
      file.addEventListener("change", async () => {
        const chosen = file.files?.[0]
        file.value = ""
        if (!chosen || !this.uploadImage) return
        const uploaded = await this.uploadImage(chosen)
        if (uploaded) this.#view?.run((s) => insertBlock(s, block("image", [], { src: uploaded.src, alt: uploaded.alt ?? "" })))
        back()
      })
      const insert = tool("Insert image", "image", () => file.click())
      image = h("span", { style: "display: contents" }, insert.el, file)
    }

    const link = this.buildLink()
    const el = h(
      "ui-toolbar",
      // Agents format through the editor's Markdown; the toolbar acts on a person's selection.
      { class: "rich-text-toolbar", "aria-label": `${this.label} formatting`, "data-agent-hidden": "" },
      blockType,
      h("ui-toolbar-separator"),
      ...marks.values(),
      link.toggle,
      link.popover,
      h("ui-toolbar-separator"),
      ...lists.values(),
      divider.el,
      image,
      h("ui-toolbar-separator"),
      undo.el,
      redo.el,
    )
    return { el, blockType, marks, lists, link, undo: undo.button, redo: redo.button }
  }

  private buildLink() {
    // A toggle (pressed while the caret is in a link) that opens the link popover, as in React.
    const button = h("button", { type: "button", "aria-label": "Link", "aria-keyshortcuts": ariaKeyshortcuts("mod+k"), "aria-haspopup": "dialog", "aria-expanded": "false", onmousedown: keepSelection }, iconElement("link")) as HTMLButtonElement
    const toggle = h("ui-toggle", null, button) as ToggleElement
    toggle.addEventListener("pressedchange", (event) => {
      event.preventDefault()
      queueMicrotask(() => this.sync())
      this.openLink()
    })
    const title = h("ui-popover-title")
    const inputId = uid("rich-text-link")
    const problemId = uid("rich-text-link-problem")
    const input = h("input", { id: inputId, inputmode: "url", autocomplete: "url", spellcheck: "false", placeholder: "https://" }) as HTMLInputElement
    const problem = h("p", { class: "rich-text-link-problem", id: problemId, role: "alert", hidden: true })
    const remove = h("ui-button", null, h("button", { type: "button", "data-variant": "ghost" }, "Remove link"))
    const save = h("button", { type: "submit" }) as HTMLButtonElement
    const form = h(
      "form",
      { class: "rich-text-link-form" },
      h("ui-field", null, h("ui-field-label", null, "Link address"), h("ui-input", null, input), problem),
      h("div", { class: "rich-text-link-actions" }, remove, h("ui-button", null, save)),
    )
    const popover = h("ui-popover", null, h("ui-popover-content", { class: "rich-text-link", "initial-focus": "input", hidden: true }, title, form)) as PopoverElement
    popover.addEventListener("openchange", (event) => {
      const open = (event as CustomEvent<{ value: boolean }>).detail.value
      attr(button, "aria-expanded", String(open))
      // Closed without saving (Escape, a click outside): back to the text.
      if (!open)
        requestAnimationFrame(() => {
          const active = document.activeElement
          if (!active || active === document.body || this.contains(active)) this.#view?.focus()
        })
    })
    input.addEventListener("input", () => {
      problem.hidden = true
      attr(input, "aria-invalid", null)
    })
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      this.applyLink(input.value.trim() || null)
    })
    remove.firstElementChild!.addEventListener("click", () => this.applyLink(null))
    return { toggle, popover, button, title, input, problem, remove, save }
  }

  /* ------------------------------------------------------------ the link popover */

  private openLink() {
    const link = this.#dom?.link
    if (!link || this.locked) return
    this.prepareLink()
    void link.popover.api?.open({ anchor: link.button })
  }

  private prepareLink() {
    const link = this.#dom!.link!
    const now = this.#view!.state
    // The whole link when the caret is inside one; otherwise the selection.
    this.#linkRange = now.selection && collapsed(now.selection) ? (linkRange(now) ?? now.selection) : now.selection
    const current = activeLink(now)
    link.input.value = current ?? ""
    link.title.textContent = current ? "Edit link" : "Add a link"
    link.save.textContent = current ? "Save link" : "Add link"
    link.remove.hidden = !current
    link.problem.hidden = true
    attr(link.input, "aria-invalid", null)
  }

  private applyLink(href: string | null) {
    const link = this.#dom!.link!
    const range = this.#linkRange
    let refused = false
    this.#view!.run((s) => {
      const target = range ? select(s, range) : s
      const next = setLink(target, href)
      if (href && next === target) refused = true
      return next
    })
    if (refused) {
      link.problem.textContent = "Use a web address (https://…), a mail address (mailto:…) or a path (/docs)."
      link.problem.hidden = false
      attr(link.input, "aria-invalid", "true")
      attr(link.input, "aria-describedby", link.problem.id)
      return
    }
    link.popover.open = false
    requestAnimationFrame(() => this.#view?.focus())
  }

  /* ------------------------------------------------------------ keeping in step */

  private syncTriggers() {
    const menu = this.#dom?.menu
    if (!menu) return
    menu.triggers = [
      ...(this.#commands.length ? [{ char: "/", boundary: "start", items: this.#commands.map(({ value, label }) => ({ value, label })) }] : []),
      ...(this.#mentions.length ? [{ char: "@", type: "mention", items: this.#mentions }] : []),
    ]
  }

  private describeItems() {
    for (const item of this.#dom!.list.querySelectorAll<HTMLElement>("ui-trigger-menu-item:not([data-described])")) {
      const command = this.#commands.find((c) => c.value === item.getAttribute("value"))
      if (!command) continue
      item.setAttribute("data-described", "")
      const name = h("span", null, ...item.childNodes)
      const mark = command.icon ? iconElement(command.icon) : command.glyph ? h("span", { class: "rich-text-menu-glyph", "aria-hidden": "true" }, command.glyph) : null
      item.replaceChildren(...[mark, h("span", { class: "rich-text-menu-text" }, name, command.description ? h("span", { class: "rich-text-menu-hint" }, command.description) : null)].filter((n): n is HTMLElement => !!n))
    }
  }

  private sync() {
    const dom = this.#dom
    const view = this.#view
    if (!dom || !view) return
    const state = this.#state
    const disabled = isOn(this, "disabled")
    const readOnly = isOn(this, "readonly")
    view.setReadOnly(this.locked)
    attr(dom.root, "data-disabled", disabled)
    attr(dom.root, "data-readonly", readOnly)
    attr(dom.area, "aria-label", this.label)
    attr(dom.area, "aria-placeholder", this.getAttribute("placeholder"))
    attr(dom.area, "aria-disabled", disabled ? "true" : null)
    // What agents read: the text as Markdown, with the same refusals as a person gets.
    const markdown = toMarkdown(state.doc)
    if (dom.area.value !== markdown) dom.area.value = markdown
    dom.area.readOnly = readOnly
    dom.area.disabled = disabled
    if (dom.toolbar) {
      dom.toolbar.hidden = readOnly
      attr(dom.toolbar, "aria-label", `${this.label} formatting`)
      const current = activeBlock(state)
      const value = blockOptionValue(current ?? undefined)
      if (dom.blockType && dom.blockType.value !== value) dom.blockType.value = value
      for (const [mark, el] of dom.marks) if (el.pressed !== markActive(state, mark as Parameters<typeof markActive>[1])) el.pressed = markActive(state, mark as Parameters<typeof markActive>[1])
      for (const [type, el] of dom.lists) if (el.pressed !== (current?.type === type)) el.pressed = current?.type === type
      if (dom.link && dom.link.toggle.pressed !== !!activeLink(state)) dom.link.toggle.pressed = !!activeLink(state)
      if (dom.undo) dom.undo.disabled = !view.canUndo()
      if (dom.redo) dom.redo.disabled = !view.canRedo()
    }
    const max = Number(this.getAttribute("max-length")) || 0
    dom.count.hidden = !max
    if (max) {
      const n = counts(state.doc).characters
      dom.count.textContent = n > max ? `${n - max} over the limit of ${max} characters` : `${n} / ${max} characters`
      attr(dom.count, "data-over", n > max ? "true" : null)
    }
    attr(dom.area, "aria-describedby", max ? dom.count.id : null)
    const name = this.getAttribute("name")
    dom.input.disabled = !name
    dom.input.name = name ?? ""
    dom.input.value = name ? (this.getAttribute("format") === "markdown" ? markdown : toHTML(state.doc)) : ""
  }
}

/** <uiset-rich-text-content value="## Markdown">, or its `doc` property: saved text, read-only, in the editor's styles. */
class UISetRichTextContent extends ElementBase {
  static observedAttributes = ["value"]
  #doc: Doc | null = null

  get doc(): Doc {
    return this.#doc ?? fromMarkdown(this.getAttribute("value") ?? "")
  }
  set doc(doc: Doc) {
    this.#doc = doc
    this.draw()
  }

  connectedCallback() {
    upgradeProperties(this, ["doc"])
    this.draw()
  }

  attributeChangedCallback() {
    this.#doc = null
    this.draw()
  }

  private draw() {
    this.classList.add("rich-text-content", "rich-text-static")
    this.replaceChildren(renderDocument(this.doc))
  }
}

function defineRichText() {
  createParts(richTextPrimitive, {
    root: { tag: "uiset-rich-text-area", api: ["setValue", "insert", "clear"] },
  })
  defineElement("uiset-rich-text", UISetRichText)
  defineElement("uiset-rich-text-content", UISetRichTextContent)
}

export { defineRichText }
export type { Person as RichTextPerson, UploadImage as RichTextUploadImage }
export { UISetRichText, UISetRichTextContent }
export type { UISetRichTextEvents }
