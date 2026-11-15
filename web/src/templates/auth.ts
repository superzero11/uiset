// The Auth pages as web elements: sign in, sign up, forgot and reset password, and verify a
// code, switched by the address's hash as the React demo is. The sample handlers succeed or
// explain why not: try "wrong" as the password, or 000000 as the code.
import "@ui-sdk/web/checkbox"
import "@ui-sdk/web/meter"
import "@ui-sdk/web/otp-input"
import "@ui-sdk/web/password-input"
import { createAgent } from "@ui-sdk/web/agent"
import { alertElement, bindForm, wait } from "./common"

const screens = ["sign-in", "sign-up", "forgot-password", "reset-password", "verify"] as const
type Screen = (typeof screens)[number]
const frame = document.getElementById("frame")!

/** 0–4 from length and variety: a nudge, not a rule (the React template's own). */
function passwordStrength(password: string) {
  let score = 0
  if (password.length >= 10) score++
  if (password.length >= 14) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  return password ? Math.max(1, score) : 0
}
const strengthWords = ["", "Weak", "Fair", "Good", "Strong"]

/** A new password with its strength meter, as the React NewPassword field. */
function newPassword(label: string) {
  const field = document.createElement("ui-field")
  field.setAttribute("name", "password")
  field.innerHTML = `
    <ui-field-label>${label}</ui-field-label>
    <ui-password-input name="password" required data-agent-secret>
      <input autocomplete="new-password" minlength="10" />
      <ui-password-input-toggle><button type="button" aria-label="Show ${label.toLowerCase()}" data-variant="ghost"></button></ui-password-input-toggle>
    </ui-password-input>
    <ui-field-description>At least 10 characters. Longer is stronger.</ui-field-description>
    <ui-meter class="auth-strength" aria-label="${label} strength" value="0" max="4" data-strength="0" data-agent-hidden>
      <ui-meter-track><ui-meter-indicator></ui-meter-indicator></ui-meter-track>
    </ui-meter>
    <ui-field-error match="valueMissing">Choose a password.</ui-field-error>
    <ui-field-error match="tooShort">Use at least 10 characters.</ui-field-error>`
  const meter = field.querySelector("ui-meter") as HTMLElement & { value: number; format: (value: number) => string }
  meter.format = (value) => (value ? strengthWords[value]! : "Not set")
  field.querySelector("input")!.addEventListener("input", (event) => {
    const strength = passwordStrength((event.target as HTMLInputElement).value)
    meter.value = strength
    meter.dataset.strength = String(strength)
  })
  return field
}

function show(screen: Screen) {
  const template = document.getElementById(screen) as HTMLTemplateElement
  frame.replaceChildren(template.content.cloneNode(true))
  frame.querySelector("[data-brand]")?.append((document.getElementById("brand") as HTMLTemplateElement).content.cloneNode(true))
  for (const slot of frame.querySelectorAll<HTMLElement>("[data-new-password]")) slot.replaceWith(newPassword(slot.dataset.newPassword!))
  const form = frame.querySelector("form")!
  const go = (next: Screen) => (window.location.hash = next)
  if (screen === "sign-in")
    bindForm(form, (data) => ({ password: String(data.get("password") ?? "") }), async ({ password }) => {
      await wait(700)
      if (password === "wrong") return "That email and password don't match. Try again or reset it."
    }, "Signing in…")
  else if (screen === "sign-up")
    bindForm(form, () => ({}), async () => {
      await wait(600)
      go("verify")
    }, "Creating your account…")
  else if (screen === "forgot-password")
    bindForm(form, (data) => ({ email: String(data.get("email") ?? "") }), async ({ email }) => {
      await wait(600)
      // Done: the panel says where the link went.
      frame.querySelector(".auth-title")!.textContent = "Check your email"
      frame.querySelector(".auth-description")!.textContent = `If ${email} has an account, a reset link is on its way. It works for 30 minutes.`
      form.replaceWith(alertElement("success", "Link sent. You can close this page.", { live: true }))
    }, "Sending…")
  else if (screen === "reset-password") {
    const confirm = form.querySelector<HTMLInputElement>('[name="confirm"] input')!
    confirm.addEventListener("input", () => confirm.setCustomValidity(""))
    form.querySelector('[name="password"] input')!.addEventListener("input", () => confirm.setCustomValidity(""))
    // The passwords must match before the form goes anywhere.
    form.addEventListener("submit", (event) => {
      const data = new FormData(form)
      if (data.get("password") && data.get("confirm") && data.get("password") !== data.get("confirm")) {
        event.stopImmediatePropagation()
        event.preventDefault()
        confirm.setCustomValidity("The passwords don't match.")
        form.reportValidity()
        confirm.focus()
      }
    }, { capture: true })
    bindForm(form, () => ({}), async () => {
      await wait(600)
      go("sign-in")
    }, "Saving…")
  } else if (screen === "verify") {
    bindForm(form, (data) => ({ code: String(data.get("code") ?? "") }), async ({ code }) => {
      await wait(500)
      if (code === "000000") return "That code has expired. Send a new one."
      go("sign-in")
    }, "Checking…")
    // A new code waits 30 seconds between sends; the wait starts on the press.
    const resend = form.querySelector<HTMLButtonElement>("[data-resend]")!
    let left = 30
    const tick = () => {
      resend.textContent = left > 0 ? `Send a new code in ${left}s` : "Send a new code"
      if (left > 0) resend.setAttribute("aria-disabled", "true")
      else resend.removeAttribute("aria-disabled")
    }
    tick()
    const timer = setInterval(() => {
      if (!resend.isConnected) return clearInterval(timer)
      if (left > 0) left--
      tick()
    }, 1000)
    resend.addEventListener("click", async () => {
      if (left > 0) return
      left = 30
      tick()
      await wait(300)
    })
  }
}

const follow = () => {
  const hash = window.location.hash.slice(1) as Screen
  show(screens.includes(hash) ? hash : "sign-in")
}
window.addEventListener("hashchange", follow)
follow()
Object.assign(window, { agent: createAgent() })
