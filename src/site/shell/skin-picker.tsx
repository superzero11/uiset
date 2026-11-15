import { useEffect, useState } from "react"
import { SegmentedControl, SegmentedControlItem } from "@/registry/uiset/ui/segmented-control"
import type { Skin } from "@/registry/uiset/ui/uiset"

const skins: { value: Skin; label: string; what: string }[] = [
  { value: "base", label: "Base", what: "Your shadcn theme, or one built from a single key color." },
  { value: "blueprint", label: "Blueprint", what: "A technical drawing: cyanotype paper, linework and hatching." },
  { value: "studio", label: "Studio", what: "A synth rack: gunmetal panels, rubber pads and amber lamps." },
  { value: "phosphor", label: "Phosphor", what: "A green-screen terminal: intensity, inverse video, scan lines." },
  { value: "ink", label: "Ink", what: "E-paper: ink on grey, dotted greys, a reading serif, no motion." },
]

/** A value kept in the page's address (?skin=…), so a link shows what you saw. */
function useUrlState<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => {
    const v = new URLSearchParams(window.location.search).get(key)
    return allowed.includes(v as T) ? (v as T) : fallback
  })
  useEffect(() => {
    const url = new URL(window.location.href)
    if (value === fallback) url.searchParams.delete(key)
    else url.searchParams.set(key, value)
    window.history.replaceState(window.history.state, "", url)
  }, [key, value, fallback])
  return [value, setValue] as const
}

function SkinPicker({ value, onChange, label = "Skin" }: { value: Skin; onChange: (skin: Skin) => void; label?: string }) {
  return (
    <SegmentedControl className="skin-picker" aria-label={label} value={value} onValueChange={(v) => v && onChange(v as Skin)}>
      {skins.map((s) => (
        <SegmentedControlItem key={s.value} value={s.value}>
          {s.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

const skinValues = skins.map((s) => s.value)

export { SkinPicker, skins, skinValues, useUrlState }
