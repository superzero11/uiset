import { createParts, type PartProps } from "@ui-sdk/solid/primitive"
import { createUniqueId, omit, Show } from "solid-js"
import { inlineEdit, type InlineEditOptions } from "../../registry/uiset/ui/inline-edit/inline-edit"
import { Icon } from "./shell/icons"
import "../../registry/uiset/ui/shell/shell.css"
import "../../registry/uiset/ui/inline-edit/inline-edit.css"

const parts = createParts(inlineEdit, {
  root: "div",
  preview: "button",
  input: "input",
  save: "button",
  cancel: "button",
  error: "span",
})

type InlineEditProps = Omit<InlineEditOptions, "errorId"> &
  Omit<PartProps<"div">, "defaultValue" | "onChange" | "children" | "aria-label"> & {
    /** What the value is, like "Project name". It names the field and its buttons. */
    label: string
    /** Shown in place of an empty value. */
    placeholder?: string
    /** Show Save and Cancel buttons while editing, for touch screens with no Escape key. */
    actions?: boolean
    editLabel?: string
    saveLabel?: string
    cancelLabel?: string
  }

function InlineEdit(props: InlineEditProps) {
  const errorId = createUniqueId()
  const placeholder = () => props.placeholder ?? "Empty"
  const rest = omit(props, "label", "placeholder", "actions", "editLabel", "saveLabel", "cancelLabel", "class")
  return (
    <parts.Root aria-label={props.label} errorId={errorId} class={["inline-edit", props.class as string | undefined]} {...rest}>
      {/* Each part reads only the state it shows: the input isn't rebuilt as it's typed in. */}
      {(state) => (
        <Show
          when={state.editing}
          fallback={
            // The name holds the text people see, so someone who speaks it still finds it.
            <parts.Preview aria-label={`${props.editLabel ?? `Edit ${props.label}`}: ${state.value || placeholder()}`}>
              <span class="inline-edit-value">{state.value || placeholder()}</span>
              <Icon name="edit" />
            </parts.Preview>
          }
        >
          <parts.Input aria-label={props.label} autocomplete="off" />
          <Show when={props.actions}>
            <parts.Save aria-label={props.saveLabel ?? `Save ${props.label}`}>
              <Icon name="check" />
            </parts.Save>
            <parts.Cancel aria-label={props.cancelLabel ?? "Cancel"}>
              <Icon name="close" />
            </parts.Cancel>
          </Show>
          <Show when={state.error}>{(error) => <parts.Error id={errorId}>{error()}</parts.Error>}</Show>
        </Show>
      )}
    </parts.Root>
  )
}

const InlineEditRoot = parts.Root
const InlineEditPreview = parts.Preview
const InlineEditInput = parts.Input
const InlineEditSave = parts.Save
const InlineEditCancel = parts.Cancel
const InlineEditError = parts.Error

export { InlineEdit, InlineEditCancel, InlineEditError, InlineEditInput, InlineEditPreview, InlineEditRoot, InlineEditSave }
export type { InlineEditProps }
