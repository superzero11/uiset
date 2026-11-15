import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselViewport,
} from "@/registry/uiset/ui/carousel"

export default function CarouselExample() {
  return (
    <Carousel aria-label="What's new">
      <CarouselViewport>
        <CarouselContent>
          <CarouselItem className="slide">Skins nest without leaking</CarouselItem>
          <CarouselItem className="slide">Agents ask before deleting</CarouselItem>
          <CarouselItem className="slide">Code takes the skin's colors</CarouselItem>
        </CarouselContent>
      </CarouselViewport>
      <CarouselPrevious aria-label="Previous slide" />
      <CarouselNext aria-label="Next slide" />
    </Carousel>
  )
}
