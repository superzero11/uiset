"use client"

import type { ConnectDraft } from "@ui-sdk/core"
import { createParts, type PartProps } from "@ui-sdk/react/primitive"
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { cablePath as sag, localPoint, type Point } from "./studio/cables"
import { patchBay, type Cable, type PatchBayOptions } from "./studio/patch-bay"
import "./studio/patch-bay.css"

const parts = createParts(patchBay, { root: "div", jack: "button" })


function Cables({ cables, draft }: { cables: Cable[]; draft: ConnectDraft | null }) {
  const svg = useRef<SVGSVGElement>(null)
  const [centers, setCenters] = useState<Record<string, Point>>({})

  useLayoutEffect(() => {
    const root = svg.current?.parentElement
    if (!root) return
    const measure = () => {
      const next: Record<string, Point> = {}
      for (const jack of root.querySelectorAll<HTMLElement>("[data-port]")) {
        const rect = jack.getBoundingClientRect()
        next[jack.dataset.port!] = localPoint(root, rect.left + rect.width / 2, rect.top + rect.height / 2)
      }
      setCenters(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    for (const jack of root.querySelectorAll("[data-port]")) observer.observe(jack)
    void document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [])

  const loose = draft && centers[draft.from]
  const end = draft && (draft.to ? centers[draft.to] : { x: draft.x, y: draft.y })

  return (
    <svg ref={svg} className="patch-bay-cables" aria-hidden="true" focusable="false">
      {cables.map((cable, index) => {
        const a = centers[cable.from]
        const b = centers[cable.to]
        if (!a || !b) return null
        return (
          <g
            key={`${cable.from}>${cable.to}`}
            className="patch-bay-cable"
            style={
              {
                "--cable-color": `var(--uiset-cable-${(index % 5) + 1})`,
              } as CSSProperties
            }
          >
            <path d={sag(a, b)} />
            <circle cx={a.x} cy={a.y} r="5.5" />
            <circle cx={b.x} cy={b.y} r="5.5" />
          </g>
        )
      })}
      {loose && end && (
        <g
          className="patch-bay-cable"
          data-draft=""
          style={
            {
              "--cable-color": `var(--uiset-cable-${(cables.length % 5) + 1})`,
            } as CSSProperties
          }
        >
          <path d={sag(loose, end)} />
          <circle cx={loose.x} cy={loose.y} r="5.5" />
          <circle cx={end.x} cy={end.y} r="5.5" />
        </g>
      )}
    </svg>
  )
}

type PatchBayProps = PatchBayOptions &
  Omit<PartProps<"div">, "defaultValue" | "onChange" | "children"> & {
    children: ReactNode
  }

function PatchBay({ children, className, ...props }: PatchBayProps) {
  return (
    <parts.Root className={["patch-bay", className].filter(Boolean).join(" ")} {...props}>
      {({ cables, connecting }) => (
        <>
          {children}
          <Cables cables={cables} draft={connecting} />
        </>
      )}
    </parts.Root>
  )
}

type PatchBayJackProps = Omit<PartProps<"button">, "value"> & {
  port: string
  label: string
}

function PatchBayJack({ port, label, ...props }: PatchBayJackProps) {
  return <parts.Jack value={port} aria-label={label} {...props} />
}

export { PatchBay, PatchBayJack }
export type { Cable, PatchBayJackProps, PatchBayProps }
