import type { ComponentProps } from "@solidjs/web"
import { For, omit } from "solid-js"
import {
  Pagination as PaginationRoot,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@ui-sdk/solid/pagination"

function Pagination(props: ComponentProps<typeof PaginationRoot>) {
  return (
    <PaginationRoot {...omit(props, "children")}>
      {props.children ?? (
        <PaginationList>
          {({ items }) => (
            <>
              <PaginationItem>
                <PaginationPrevious aria-label="Previous page" />
              </PaginationItem>
              <For each={items}>{(item) => <PaginationItem>{typeof item === "number" ? <PaginationLink page={item} /> : <PaginationEllipsis />}</PaginationItem>}</For>
              <PaginationItem>
                <PaginationNext aria-label="Next page" />
              </PaginationItem>
            </>
          )}
        </PaginationList>
      )}
    </PaginationRoot>
  )
}

export { Pagination, PaginationEllipsis, PaginationItem, PaginationLink, PaginationList, PaginationNext, PaginationPrevious }
export { PaginationFirst, PaginationLast, createPaginationController, paginationRange } from "@ui-sdk/solid/pagination"
