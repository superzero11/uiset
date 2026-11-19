"use client"

import { announce } from "@ui-sdk/core"
import { useEffect, useRef } from "react"
import type * as React from "react"
import { FieldDescription } from "./field"

export { Textarea, createInputController } from "@ui-sdk/react/textarea"
export type {
  InputController,
  InputGroupOptions,
  InputGroupPrimitive,
  InputGroupState,
  InputOptions,
  InputPrimitive,
  InputProps,
  InputState,
  InputValueChangeReason,
  TextareaOptions,
  TextareaPrimitive,
  TextareaProps,
  TextareaState,
  TextareaSubmitDetails,
} from "@ui-sdk/react/textarea"

type TextareaCountMessages = {
  count: (length: number, max: number) => string
  left: (left: number) => string
  full: string
}

const countMessages: TextareaCountMessages = {
  count: (length, max) => `${length} / ${max} characters`,
  left: (left) => `${left} ${left === 1 ? "character" : "characters"} left`,
  full: "No characters left",
}

// How much of a textarea's limit is used, as its field's description: a screen reader hears it
// with the textarea. Near the limit it says how many are left, once on reaching `warnAt` and once
// at none, not on every key. Pass the textarea's value; give the textarea maxLength={max}.
function TextareaCount({
  value,
  max,
  warnAt = 20,
  messages,
  className,
  ...props
}: Omit<React.ComponentProps<typeof FieldDescription>, "children"> & {
  value: string
  max: number
  warnAt?: number
  messages?: Partial<TextareaCountMessages>
}) {
  const words = { ...countMessages, ...messages }
  const left = max - value.length
  const band = left <= 0 ? "full" : left <= warnAt ? "near" : "room"
  const last = useRef(band)
  useEffect(() => {
    if (band === last.current) return
    if (band === "near" && last.current === "room") announce(words.left(left))
    if (band === "full") announce(words.full)
    last.current = band
  }, [band, left, words])
  return (
    <FieldDescription className={["uiset-textarea-count", className].filter(Boolean).join(" ")} {...props}>
      {/* Its own span: skins color every field description, and the tone has to win. */}
      <span data-near={band !== "room" ? "" : undefined} data-full={band === "full" ? "" : undefined}>
        {words.count(value.length, max)}
      </span>
    </FieldDescription>
  )
}

export { TextareaCount }
export type { TextareaCountMessages }
