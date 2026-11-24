import type { ComponentProps } from "@solidjs/web"
import { announce } from "@ui-sdk/core"
import { createEffect, omit } from "solid-js"
import { FieldDescription } from "./field"
import { withClass } from "./shell/class"

export { Textarea, createInputController } from "@ui-sdk/solid/textarea"
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
} from "@ui-sdk/solid/textarea"

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
function TextareaCount(
  props: Omit<ComponentProps<typeof FieldDescription>, "children"> & {
    value: string
    max: number
    warnAt?: number
    messages?: Partial<TextareaCountMessages>
  },
) {
  const words = () => ({ ...countMessages, ...props.messages })
  const left = () => props.max - props.value.length
  const band = () => (left() <= 0 ? "full" : left() <= (props.warnAt ?? 20) ? "near" : "room")
  createEffect(
    () => ({ band: band(), left: left(), words: words() }),
    (now, before) => {
      if (!before || now.band === before.band) return
      if (now.band === "near" && before.band === "room") announce(now.words.left(now.left))
      if (now.band === "full") announce(now.words.full)
    },
  )
  return (
    <FieldDescription class={withClass("uiset-textarea-count", () => props.class)} {...omit(props, "value", "max", "warnAt", "messages", "class")}>
      {/* Its own span: skins color every field description, and the tone has to win. */}
      <span data-near={band() !== "room" ? "" : undefined} data-full={band() === "full" ? "" : undefined}>
        {words().count(props.value.length, props.max)}
      </span>
    </FieldDescription>
  )
}

export { TextareaCount }
export type { TextareaCountMessages }
