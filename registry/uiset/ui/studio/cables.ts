// A patch cable's path between two jacks: it sags under its own weight, more the longer it
// is, like a real one. Shared by the React patch bay and the web element.

type Point = { x: number; y: number }

function cablePath(a: Point, b: Point) {
  const drop = Math.min(150, 28 + Math.hypot(b.x - a.x, b.y - a.y) * 0.35)
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + drop}, ${b.x} ${b.y + drop}, ${b.x} ${b.y}`
}

export { cablePath }
export type { Point }
