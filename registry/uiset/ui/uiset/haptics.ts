type Strength = "light" | "medium"

let iosSwitch: HTMLLabelElement | null = null

function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
}

function isTouchSafari() {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  return (
    /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  )
}

// iOS Safari has no Vibration API, but toggling a switch-style checkbox through its
// label plays the system haptic (iOS 18+). It must run inside a user gesture.
function switchHaptic() {
  if (!iosSwitch) {
    iosSwitch = document.createElement("label")
    iosSwitch.setAttribute("aria-hidden", "true")
    iosSwitch.style.cssText =
      "position:fixed;inset:auto auto 0 0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none"
    const input = document.createElement("input")
    input.type = "checkbox"
    input.setAttribute("switch", "")
    input.tabIndex = -1
    iosSwitch.append(input)
    document.body.append(iosSwitch)
  }
  iosSwitch.click()
}

function haptic(strength: Strength = "light") {
  if (canVibrate()) {
    navigator.vibrate(strength === "light" ? 6 : 12)
    return
  }
  if (isTouchSafari()) switchHaptic()
}

export { haptic }
export type { Strength }
