// A problem found as focus leaves a field waits for the press that took focus away to end.
// Shown at once, it pushes what's under the field down while the pointer is still down, and
// the release lands off the button: a click on Save or Pay that never happens. Shared by
// React and Web Components; it listens from the moment it's imported, so it sees the press
// that comes before the blur.

let pressed = false
let waiting: (() => void)[] = []

function flush() {
  pressed = false
  const runs = waiting
  waiting = []
  for (const run of runs) run()
}

if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", () => (pressed = true), true)
  // The release's click runs its handlers in the same task, so a timer runs after them.
  const end = () => setTimeout(flush)
  document.addEventListener("pointerup", end, true)
  document.addEventListener("pointercancel", end, true)
}

/** Runs `show` now, or, while a pointer is pressed, once the press and its click are over. */
function afterPress(show: () => void) {
  if (pressed) waiting.push(show)
  else show()
}

export { afterPress }
