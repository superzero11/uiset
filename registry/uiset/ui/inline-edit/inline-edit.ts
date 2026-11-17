import {
  announce,
  createChange,
  createInlineEdit,
  definePrimitive,
  type ChangeDetails,
  type InlineEditReason,
} from "@ui-sdk/core"

type InlineEditOptions = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, details: ChangeDetails<InlineEditReason>) => void
  /** Returns what's wrong with the text, or nothing when it can be saved. */
  validate?: (text: string) => string | null | undefined
  disabled?: boolean
  /** The id of the element that shows the problem, so the field can point at it. */
  errorId?: string
}

// One value, so one id for createInlineEdit to hold while it's being edited.
const id = "value"

/** @internal Left out of @uiset/web's declarations: its type names UI SDK internals. */
const inlineEdit = definePrimitive({
  name: "inline-edit",
  options: {
    value: "string",
    defaultValue: "string",
    onValueChange: "callback",
    validate: "action",
    disabled: "boolean",
    errorId: "string",
  },
  controlled: ["value"],
  state: (options: InlineEditOptions) => ({
    value: options.value ?? options.defaultValue ?? "",
    editing: null as string | null,
    error: null as string | null,
    disabled: options.disabled ?? false,
    errorId: options.errorId,
  }),
  sync: (options) => ({
    ...(options.value === undefined ? {} : { value: options.value }),
    disabled: options.disabled ?? false,
    errorId: options.errorId,
  }),
  api: (context) => {
    const change = createChange(context)
    const { store } = context

    const save = (text: string, details: { reason: InlineEditReason; event?: Event }) => {
      const problem = context.options().validate?.(text)
      if (problem) {
        store.set({ error: problem })
        announce(problem, { priority: "assertive" })
        return false
      }
      store.set({ error: null })
      return change("value", text, details)
    }

    const edit = createInlineEdit(context, {
      key: "editing",
      value: () => store.get().value,
      commit: (_id, text, details) => save(text, details),
      disabled: () => store.get().disabled,
    })

    // The value's button is gone while the field shows, so when Enter, Escape, Save or
    // Cancel ends an edit there is nothing for focus to go back to. The new button takes it
    // as it arrives. Leaving the field (a click elsewhere, Tab) keeps focus where it went.
    let refocus = false
    const ended = () => {
      refocus = store.get().editing === null
    }

    return {
      edit,
      startEditing: (event?: Event) =>
        edit.start(id, { reason: event ? "edit-key" : "imperative", event }),
      setValue: (text: string) => save(text, { reason: "imperative" }),
      inputKeydown(event: KeyboardEvent) {
        // Tab is left to the browser: focus moves to the next control and leaving saves.
        // (The helper's own Tab keeps focus here, for a grid to place.) Text that can't be
        // saved keeps focus in the field instead.
        if (event.key === "Tab") {
          const problem = context.options().validate?.((event.target as HTMLInputElement).value)
          if (!problem) return
          event.preventDefault()
          store.set({ error: problem })
          announce(problem, { priority: "assertive" })
          return
        }
        if (edit.inputKeydown(event) && (event.key === "Enter" || event.key === "Escape")) ended()
      },
      save(event?: Event) {
        edit.end(event ? "enter-key" : "imperative", event)
        ended()
      },
      cancel() {
        edit.cancel()
        store.set({ error: null })
        ended()
      },
      takesFocus() {
        const take = refocus
        refocus = false
        return take
      },
    }
  },
  slots: (slot) => ({
    root: slot<
      {},
      { value: string; editing: boolean; error: string | null; disabled: boolean }
    >({
      role: "group",
      state: (state) => ({
        value: state.value,
        editing: state.editing !== null,
        error: state.error,
        disabled: state.disabled,
      }),
      attrs: (state) => ({
        "data-editing": state.editing !== null ? "" : undefined,
        "data-empty": state.value === "" ? "" : undefined,
        "data-invalid": state.error ? "" : undefined,
        "data-disabled": state.disabled ? "" : undefined,
      }),
    }),
    // What shows while it isn't being edited: a button, so a press, Enter or Space edits it.
    preview: slot({
      role: "button",
      focus: "native",
      keys: ["F2"],
      press: ({ api }, event) => {
        api.startEditing(event)
      },
      attrs: (state) => ({
        type: "button",
        // Not `disabled`: a value that can't be edited right now can still be read and
        // tabbed to.
        "aria-disabled": state.disabled ? "true" : undefined,
        "data-disabled": state.disabled ? "" : undefined,
      }),
      on: {
        keydown: (event, { api }) => {
          if ((event as KeyboardEvent).key === "F2") api.edit.keydown(event as KeyboardEvent, id)
        },
      },
      bind: (el, { api }) => {
        if (api.takesFocus()) el.focus()
      },
    }),
    input: slot({
      attrs: (state) => ({
        "aria-invalid": state.error ? "true" : undefined,
        "aria-describedby": state.error ? state.errorId : undefined,
      }),
      on: {
        keydown: (event, { api }) => {
          api.inputKeydown(event as KeyboardEvent)
        },
        input: (_event, { store }) => {
          if (store.get().error) store.set({ error: null })
        },
        // Focus moving to Save or Cancel isn't leaving: those buttons decide what happens.
        focusout: (event, { api, el }) => {
          const next = (event as FocusEvent).relatedTarget as Node | null
          const root = el?.closest('[data-slot="inline-edit"]')
          if (next && root?.contains(next)) return
          api.edit.end("focus-out", event)
        },
      },
      bind: (el, { api }) => api.edit.bindInput(el as HTMLInputElement),
    }),
    // Save and Cancel are for pointers and touch: Enter and Escape do the same from the
    // field, and Tab saves on its way out, so neither is a tab stop.
    save: slot({
      role: "button",
      focus: { none: "Enter saves from the field, and Tab saves as it leaves" },
      press: ({ api }, event) => {
        api.save(event)
      },
      attrs: () => ({ type: "button", tabindex: "-1" }),
      on: {
        // Keeps focus in the field, so pressing here isn't first read as leaving it (which
        // saves). Both events: a mouse moves focus on mousedown, touch on the one it fakes.
        pointerdown: (event) => event.preventDefault(),
        mousedown: (event) => event.preventDefault(),
      },
    }),
    cancel: slot({
      role: "button",
      focus: { none: "Escape cancels from the field" },
      press: ({ api }) => {
        api.cancel()
      },
      attrs: () => ({ type: "button", tabindex: "-1" }),
      on: {
        pointerdown: (event) => event.preventDefault(),
        mousedown: (event) => event.preventDefault(),
      },
    }),
    error: slot({}),
  }),
  agent: { actions: ["setValue", "startEditing", "cancel"] },
})

export { inlineEdit }
export type { InlineEditOptions }
