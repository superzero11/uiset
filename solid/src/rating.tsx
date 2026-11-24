import type { ComponentProps } from "@solidjs/web"
import { omit } from "solid-js"
import { Rating as RatingRoot, RatingItem } from "@ui-sdk/solid/rating"

function Rating(props: ComponentProps<typeof RatingRoot>) {
  return <RatingRoot {...omit(props, "children")}>{props.children ?? <RatingItem />}</RatingRoot>
}

export { Rating, RatingItem }
export { createRatingController } from "@ui-sdk/solid/rating"
