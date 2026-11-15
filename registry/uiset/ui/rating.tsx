"use client"

import { Rating as RatingRoot, RatingItem } from "@ui-sdk/react/rating"
import type * as React from "react"

function Rating({ children, ...props }: React.ComponentProps<typeof RatingRoot>) {
  return <RatingRoot {...props}>{children ?? <RatingItem />}</RatingRoot>
}

export { Rating, RatingItem }
export { createRatingController } from "@ui-sdk/react/rating"
