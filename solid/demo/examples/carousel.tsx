import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselViewport,
} from "../../src/carousel"

export default function CarouselExample() {
  return (
    <Carousel aria-label="What's new">
      <CarouselViewport>
        <CarouselContent>
          <CarouselItem class="slide">Skins nest without leaking</CarouselItem>
          <CarouselItem class="slide">Agents ask before deleting</CarouselItem>
          <CarouselItem class="slide">Code takes the skin's colors</CarouselItem>
        </CarouselContent>
      </CarouselViewport>
      <CarouselPrevious aria-label="Previous slide" />
      <CarouselNext aria-label="Next slide" />
    </Carousel>
  )
}
