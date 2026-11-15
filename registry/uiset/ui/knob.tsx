"use client"

import { createParts, type PartProps } from "@ui-sdk/react/primitive"
import { useId } from "react"
import { knob, type KnobOptions } from "./studio/knob"
import "./studio/knob.css"

const parts = createParts(knob, { root: "div", indicator: "span", value: "span" })

type KnobProps = KnobOptions &
  Omit<PartProps<"div">, "defaultValue" | "onChange" | "children"> & {
    label: string
    hideLabel?: boolean
    hideValue?: boolean
  }

function Knob({
  label,
  hideLabel = false,
  hideValue = false,
  className,
  ...props
}: KnobProps) {
  const labelId = useId()
  return (
    <div className={["knob-field", className].filter(Boolean).join(" ")}>
      <span id={labelId} className="knob-label" hidden={hideLabel}>
        {label}
      </span>
      <parts.Root
        aria-labelledby={hideLabel ? undefined : labelId}
        aria-label={hideLabel ? label : undefined}
        {...props}
      >
        <parts.Indicator />
        {!hideValue && <parts.Value>{({ text }) => text}</parts.Value>}
      </parts.Root>
    </div>
  )
}

const KnobRoot = parts.Root
const KnobIndicator = parts.Indicator
const KnobValue = parts.Value

export { Knob, KnobIndicator, KnobRoot, KnobValue }
export type { KnobProps }
