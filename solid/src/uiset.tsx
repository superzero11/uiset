import type { ComponentProps, JSX } from "@solidjs/web"
import { merge, omit, onSettled } from "solid-js"
import { installUISet } from "../../registry/uiset/ui/uiset/feedback"
import { orderLayers } from "../../registry/uiset/ui/uiset/layers"
import "../../registry/uiset/ui/uiset/uiset.css"

installUISet()
orderLayers()

type KeyColor = { l: number; c: number; h: number }
type Skin = "base" | "blueprint" | "studio" | "phosphor" | "ink" | (string & {})

type UISetProps = ComponentProps<"div"> & {
  skin?: Skin
  keyColor?: KeyColor
  /** Light or dark for Base and generated skins; Blueprint, Studio and Phosphor stay dark, Ink light. */
  theme?: "light" | "dark" | "system"
  /** "reduce" keeps fades and moves nothing, whatever the system setting says. */
  motion?: "system" | "reduce"
  sound?: boolean
  haptics?: boolean
}

function UISet(props: UISetProps) {
  // Stylesheets imported after this module are on the page once it first settles.
  onSettled(() => orderLayers())
  const rest = omit(props, "skin", "keyColor", "theme", "motion", "sound", "haptics", "style")
  const attrs = merge(
    {
      get "data-skin"() {
        return props.skin ?? "base"
      },
      get "data-theme"() {
        return props.theme === "light" || props.theme === "dark" ? props.theme : undefined
      },
      get "data-key"() {
        return props.keyColor ? "" : undefined
      },
      get "data-motion"() {
        return props.motion === "reduce" ? "reduce" : undefined
      },
      get "data-sound"() {
        return props.sound ? "on" : "off"
      },
      get "data-haptics"() {
        return props.haptics === false ? "off" : "on"
      },
      get style(): JSX.CSSProperties | string | undefined {
        const key = props.keyColor
        const own = props.style
        if (!key) return own || undefined
        const vars = { "--uiset-key-l": String(key.l), "--uiset-key-c": String(key.c), "--uiset-key-h": String(key.h) }
        if (typeof own === "string") return `${Object.entries(vars).map(([name, value]) => `${name}: ${value}`).join("; ")}; ${own}`
        return { ...vars, ...(own || {}) }
      },
    },
    rest,
  )
  return <div data-uiset="" {...attrs} />
}

export { UISet }
export type { KeyColor, Skin, UISetProps }
