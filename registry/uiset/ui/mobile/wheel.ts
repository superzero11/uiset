/**
 * Keeps a wheel's value in its band. `bindScrollPicker` glides to an option the listbox
 * selects, but one selected while a scroll is still settling is left where it was (in
 * WebKit, a sheet that just opened is still settling when an agent sets the wheel). The
 * wheel then shows the old option, and the next scroll, like the sheet revealing the
 * focused option as it rests, picks a value from there. This scrolls the value back into
 * the band at once, which the picker reads as the same value.
 */
function keepWheelOnValue(list: HTMLElement) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let scrolledAt = 0
  const check = () => {
    clearTimeout(timer)
    // Still moving: look again once it stops.
    if (performance.now() - scrolledAt < 100) {
      timer = setTimeout(check, 100)
      return
    }
    const selected = list.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
    if (!selected) return
    const band = list.getBoundingClientRect()
    const option = selected.getBoundingClientRect()
    const off = option.top + option.height / 2 - (band.top + band.height / 2)
    // Within half an option it's in the band, or the picker is settling it there.
    if (Math.abs(off) > option.height / 2) list.scrollBy({ top: off, behavior: "instant" })
  }
  const scrolled = () => {
    scrolledAt = performance.now()
  }
  // Soon after a new value, before a sheet comes to rest: a glide has started by then.
  const selected = () => {
    clearTimeout(timer)
    timer = setTimeout(check, 120)
  }
  const watch = new MutationObserver(selected)
  watch.observe(list, { subtree: true, attributeFilter: ["aria-selected"] })
  list.addEventListener("scroll", scrolled, { passive: true })
  list.addEventListener("scrollend", check)
  return () => {
    clearTimeout(timer)
    watch.disconnect()
    list.removeEventListener("scroll", scrolled)
    list.removeEventListener("scrollend", check)
  }
}

export { keepWheelOnValue }
