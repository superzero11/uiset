"use client"

import type * as React from "react"
import { installUISet } from "./uiset/feedback"
import "./uiset/uiset.css"

installUISet()

type KeyColor = { l: number; c: number; h: number }
type Skin = "base" | "blueprint" | "studio" | "phosphor" | "ink" | (string & {})

type UISetProps = React.ComponentProps<"div"> & {
  skin?: Skin
  keyColor?: KeyColor
  theme?: "light" | "dark" | "system"
  sound?: boolean
  haptics?: boolean
}

function UISet({
  skin = "base",
  keyColor,
  theme = "system",
  sound = false,
  haptics = true,
  style,
  ...props
}: UISetProps) {
  const keyStyle = keyColor && {
    "--uiset-key-l": keyColor.l,
    "--uiset-key-c": keyColor.c,
    "--uiset-key-h": keyColor.h,
  }
  return (
    <div
      data-uiset=""
      data-skin={skin}
      data-theme={theme === "system" ? undefined : theme}
      data-key={keyColor ? "" : undefined}
      data-sound={sound ? "on" : "off"}
      data-haptics={haptics ? "on" : "off"}
      style={{ ...keyStyle, ...style } as React.CSSProperties}
      {...props}
    />
  )
}

export { UISet }
export type { KeyColor, Skin, UISetProps }
