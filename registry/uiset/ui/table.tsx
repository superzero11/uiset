"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
} from "react"
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaCorner,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "./scroll-area"
import "./table/table.css"

// Browsers have dropped a table's roles when CSS changes its display, which stacking does,
// so a table that stacks states each role itself.
const Stacks = createContext(false)

/** Copies each column's heading onto its cells, for the stacked layout to print beside them. */
function labelCells(table: HTMLTableElement) {
  const headings = [...table.querySelectorAll("thead tr:last-child > *")].map(
    (cell) => cell.textContent?.trim() ?? "",
  )
  for (const row of table.querySelectorAll(":scope > :is(tbody, tfoot) > tr")) {
    ;[...row.children].forEach((cell, index) => {
      if (cell.hasAttribute("data-own-label")) return
      const heading = headings[index]
      if (heading && cell.getAttribute("data-label") !== heading)
        cell.setAttribute("data-label", heading)
    })
  }
}

function Table({
  label,
  stack = false,
  stickyHeader = false,
  stickyColumn = false,
  maxHeight,
  minWidth,
  className,
  children,
  ...props
}: Omit<ComponentProps<"table">, "aria-label"> & {
  /** Names the table's scrolling region for screen readers and agents. */
  label: string
  /** Below 30rem of its own width, each row becomes a block of labelled values. */
  stack?: boolean
  /** Keeps the headings in view while the body scrolls. Give it a `maxHeight`. */
  stickyHeader?: boolean
  /** Keeps each row's first cell in view while the rest scrolls sideways. */
  stickyColumn?: boolean
  maxHeight?: string
  /** The narrowest the table gets before it scrolls sideways, like "40rem". */
  minWidth?: string
}) {
  const table = useRef<HTMLTableElement>(null)
  useEffect(() => {
    const element = table.current
    if (!stack || !element) return
    labelCells(element)
    const observer = new MutationObserver(() => labelCells(element))
    observer.observe(element, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [stack])
  return (
    <ScrollArea
      className={["table-frame", className].filter(Boolean).join(" ")}
      data-stack={stack ? "" : undefined}
      data-sticky-header={stickyHeader ? "" : undefined}
      data-sticky-column={stickyColumn ? "" : undefined}
      style={
        { "--table-max-height": maxHeight, "--table-min-width": minWidth } as CSSProperties
      }
    >
      <ScrollAreaViewport role="region" aria-label={label}>
        <ScrollAreaContent>
          <Stacks value={stack}>
            <table ref={table} role={stack ? "table" : undefined} className="table" {...props}>
              {children}
            </table>
          </Stacks>
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="horizontal">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
      <ScrollAreaScrollbar orientation="vertical">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
      <ScrollAreaCorner />
    </ScrollArea>
  )
}

function TableCaption(props: ComponentProps<"caption">) {
  return <caption {...props} />
}

function TableHeader(props: ComponentProps<"thead">) {
  return <thead role={useContext(Stacks) ? "rowgroup" : undefined} {...props} />
}

function TableBody(props: ComponentProps<"tbody">) {
  return <tbody role={useContext(Stacks) ? "rowgroup" : undefined} {...props} />
}

function TableFooter(props: ComponentProps<"tfoot">) {
  return <tfoot role={useContext(Stacks) ? "rowgroup" : undefined} {...props} />
}

function TableRow(props: ComponentProps<"tr">) {
  return <tr role={useContext(Stacks) ? "row" : undefined} {...props} />
}

type Align = "start" | "center" | "end"

function TableHead({
  align,
  scope = "col",
  ...props
}: Omit<ComponentProps<"th">, "align"> & { align?: Align }) {
  const stacks = useContext(Stacks)
  return (
    <th
      scope={scope}
      role={stacks ? (scope === "row" ? "rowheader" : "columnheader") : undefined}
      data-align={align}
      {...props}
    />
  )
}

function TableCell({
  align,
  label,
  ...props
}: Omit<ComponentProps<"td">, "align"> & {
  align?: Align
  /** What the stacked layout prints beside this cell, when it isn't the column's heading. */
  label?: string
}) {
  return (
    <td
      role={useContext(Stacks) ? "cell" : undefined}
      data-align={align}
      data-label={label}
      data-own-label={label === undefined ? undefined : ""}
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
}
