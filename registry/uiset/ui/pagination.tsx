"use client"

import {
  Pagination as PaginationRoot,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@ui-sdk/react/pagination"
import type * as React from "react"

function Pagination({ children, ...props }: React.ComponentProps<typeof PaginationRoot>) {
  return (
    <PaginationRoot {...props}>
      {children ?? (
        <PaginationList>
          {({ items }) => (
            <>
              <PaginationItem>
                <PaginationPrevious aria-label="Previous page" />
              </PaginationItem>
              {items.map((item, index) => (
                <PaginationItem key={typeof item === "number" ? item : `gap-${index}`}>
                  {typeof item === "number" ? (
                    <PaginationLink page={item} />
                  ) : (
                    <PaginationEllipsis />
                  )}
                </PaginationItem>
              ))}
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

export {
  Pagination,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
}
export {
  PaginationFirst,
  PaginationLast,
  createPaginationController,
  paginationRange,
} from "@ui-sdk/react/pagination"
