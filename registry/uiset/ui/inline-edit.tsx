"use client"

import { createParts, type PartProps } from "@ui-sdk/react/primitive"
import { useId } from "react"
import { inlineEdit, type InlineEditOptions } from "./inline-edit/inline-edit"
import { Icon } from "./shell/icons"
import "./shell/shell.css"
import "./inline-edit/inline-edit.css"

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

function InlineEdit({
  label,
  placeholder = "Empty",
  actions = false,
  editLabel = `Edit ${label}`,
  saveLabel = `Save ${label}`,
  cancelLabel = "Cancel",
  className,
  ...props
}: InlineEditProps) {
  const errorId = useId()
  return (
    <parts.Root
      aria-label={label}
      errorId={errorId}
      className={["inline-edit", className].filter(Boolean).join(" ")}
      {...props}
    >
      {({ editing, value, error }) =>
        editing ? (
          <>
            <parts.Input aria-label={label} autoComplete="off" />
            {actions && (
              <>
                <parts.Save aria-label={saveLabel}>
                  <Icon name="check" />
                </parts.Save>
                <parts.Cancel aria-label={cancelLabel}>
                  <Icon name="close" />
                </parts.Cancel>
              </>
            )}
            {error && <parts.Error id={errorId}>{error}</parts.Error>}
          </>
        ) : (
          // The name holds the text people see, so someone who speaks it still finds it.
          <parts.Preview aria-label={`${editLabel}: ${value || placeholder}`}>
            <span className="inline-edit-value">{value || placeholder}</span>
            <Icon name="edit" />
          </parts.Preview>
        )
      }
    </parts.Root>
  )
}

const InlineEditRoot = parts.Root
const InlineEditPreview = parts.Preview
const InlineEditInput = parts.Input
const InlineEditSave = parts.Save
const InlineEditCancel = parts.Cancel
const InlineEditError = parts.Error

export {
  InlineEdit,
  InlineEditCancel,
  InlineEditError,
  InlineEditInput,
  InlineEditPreview,
  InlineEditRoot,
  InlineEditSave,
}
export type { InlineEditProps }
