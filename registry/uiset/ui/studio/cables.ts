// A patch cable's path between two jacks: it sags under its own weight, more the longer it
// is, like a real one. Shared by the React patch bay and the web element.

type Point = { x: number; y: number }

function cablePath(a: Point, b: Point) {
  const drop = Math.min(150, 28 + Math.hypot(b.x - a.x, b.y - a.y) * 0.35)
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + drop}, ${b.x} ${b.y + drop}, ${b.x} ${b.y}`
}

/**
 * A point on the screen, in an element's own pixels. Screen distances stop being layout
 * distances when an ancestor scales the element (a zoomed canvas, a CSS transform), and a
 * cable drawn from them would miss its jacks: this divides the scale back out.
 */
function localPoint(surface: HTMLElement, x: number, y: number): Point {
  const box = surface.getBoundingClientRect()
  const scaleX = (surface.offsetWidth && box.width / surface.offsetWidth) || 1
  const scaleY = (surface.offsetHeight && box.height / surface.offsetHeight) || 1
  return { x: (x - box.left) / scaleX, y: (y - box.top) / scaleY }
}

export { cablePath, localPoint }
export type { Point }
