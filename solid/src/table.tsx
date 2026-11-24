import type { ComponentProps } from "@solidjs/web"
import { createContext, createEffect, omit, useContext } from "solid-js"
import { ScrollArea, ScrollAreaContent, ScrollAreaCorner, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from "./scroll-area"
import "../../registry/uiset/ui/table/table.css"

// Browsers have dropped a table's roles when CSS changes its display, which stacking does,
// so a table that stacks states each role itself. The context holds a getter, so a table that
// starts or stops stacking tells its parts.
const Stacks = createContext<() => boolean>(() => false)

/** Copies each column's heading onto its cells, for the stacked layout to print beside them. */
function labelCells(table: HTMLTableElement) {
  const headings = [...table.querySelectorAll("thead tr:last-child > *")].map((cell) => cell.textContent?.trim() ?? "")
  for (const row of table.querySelectorAll(":scope > :is(tbody, tfoot) > tr")) {
    ;[...row.children].forEach((cell, index) => {
      if (cell.hasAttribute("data-own-label")) return
      const heading = headings[index]
      if (heading && cell.getAttribute("data-label") !== heading) cell.setAttribute("data-label", heading)
    })
  }
}

function Table(
  props: Omit<ComponentProps<"table">, "aria-label"> & {
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
  },
) {
  let table: HTMLTableElement | undefined
  const stacks = () => !!props.stack
  createEffect(stacks, (stack) => {
    const element = table
    if (!stack || !element) return
    labelCells(element)
    const observer = new MutationObserver(() => labelCells(element))
    observer.observe(element, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  })
  const rest = omit(props, "label", "stack", "stickyHeader", "stickyColumn", "maxHeight", "minWidth", "class", "children")
  return (
    <ScrollArea
      class={["table-frame", props.class as string | undefined]}
      data-stack={props.stack ? "" : undefined}
      data-sticky-header={props.stickyHeader ? "" : undefined}
      data-sticky-column={props.stickyColumn ? "" : undefined}
      style={{ "--table-max-height": props.maxHeight, "--table-min-width": props.minWidth }}
    >
      <ScrollAreaViewport role="region" aria-label={props.label}>
        <ScrollAreaContent>
          <Stacks value={stacks}>
            <table ref={(el) => (table = el)} role={props.stack ? "table" : undefined} class="table" {...rest}>
              {props.children}
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
  const stacks = useContext(Stacks)
  return <thead role={stacks() ? "rowgroup" : undefined} {...props} />
}

function TableBody(props: ComponentProps<"tbody">) {
  const stacks = useContext(Stacks)
  return <tbody role={stacks() ? "rowgroup" : undefined} {...props} />
}

function TableFooter(props: ComponentProps<"tfoot">) {
  const stacks = useContext(Stacks)
  return <tfoot role={stacks() ? "rowgroup" : undefined} {...props} />
}

function TableRow(props: ComponentProps<"tr">) {
  const stacks = useContext(Stacks)
  return <tr role={stacks() ? "row" : undefined} {...props} />
}

type Align = "start" | "center" | "end"

function TableHead(props: Omit<ComponentProps<"th">, "align"> & { align?: Align }) {
  const stacks = useContext(Stacks)
  const scope = () => props.scope ?? "col"
  return <th scope={scope()} role={stacks() ? (scope() === "row" ? "rowheader" : "columnheader") : undefined} data-align={props.align} {...omit(props, "align", "scope")} />
}

function TableCell(
  props: Omit<ComponentProps<"td">, "align"> & {
    align?: Align
    /** What the stacked layout prints beside this cell, when it isn't the column's heading. */
    label?: string
  },
) {
  const stacks = useContext(Stacks)
  return (
    <td
      role={stacks() ? "cell" : undefined}
      data-align={props.align}
      data-label={props.label}
      data-own-label={props.label === undefined ? undefined : ""}
      {...omit(props, "align", "label")}
    />
  )
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow }
