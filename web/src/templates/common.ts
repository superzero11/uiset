// What the web template pages share: the frame they sit in, an alert, and a form whose
// async handler returns nothing on success or a message to show, as the React templates do.
import "@ui-sdk/web/button"
import "@ui-sdk/web/field"
import "@ui-sdk/web/input"
import "@ui-sdk/web/scroll-area"
import { iconElement } from "../uiset"
import "@/registry/uiset/ui/templates/templates.css"

type Tone = "info" | "success" | "warning" | "danger"

/** An alert as the React Alert draws it: urgent ones interrupt, live ones are announced politely. */
function alertElement(tone: Tone, text: string, { urgent = false, live = false } = {}) {
  const el = document.createElement("div")
  el.className = "alert"
  el.dataset.tone = tone
  if (urgent) el.setAttribute("role", "alert")
  else if (live) el.setAttribute("role", "status")
  const body = document.createElement("div")
  body.className = "alert-body"
  body.textContent = text
  el.append(iconElement(tone, "alert-icon"), body)
  return el
}

type Result = string | void | undefined

/**
 * Submits a form through `handler`: browser checks run first (UI SDK's field shows them and
 * the first problem takes focus); while it works the button says so and stays enabled, so
 * focus never drops; a returned message shows above the form and is announced.
 */
function bindForm<Values>(form: HTMLFormElement, read: (data: FormData) => Values, handler: (values: Values) => Promise<Result> | Result, busy: string) {
  const submit = form.querySelector<HTMLButtonElement>("button[type=submit]")!
  const label = submit.innerHTML
  let pending = false
  const clear = () => form.querySelector(":scope > .alert")?.remove()
  form.addEventListener("input", clear)
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (pending) return
    pending = true
    clear()
    submit.setAttribute("aria-disabled", "true")
    submit.dataset.pending = ""
    submit.innerHTML = `<span role="status" class="spinner"><span class="uiset-visually-hidden">${busy}</span></span> <span aria-hidden="true">${busy}</span>`
    try {
      const result = await handler(read(new FormData(form)))
      if (typeof result === "string" && result) form.prepend(alertElement("danger", result, { urgent: true }))
    } catch {
      form.prepend(alertElement("danger", "Something went wrong. Check your connection and try again.", { urgent: true }))
    } finally {
      pending = false
      submit.removeAttribute("aria-disabled")
      delete submit.dataset.pending
      submit.innerHTML = label
    }
  })
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Puts each `[data-icon]` element's icon in it: inside icon slots, before a button's text. */
function decorateIcons(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>("[data-icon]")) {
    if (el.querySelector(":scope > .uiset-icon")) continue
    const icon = iconElement(el.dataset.icon as Parameters<typeof iconElement>[0])
    if (el.matches(".sidebar-icon, .item-media")) el.append(icon)
    else el.prepend(icon)
  }
}

export { alertElement, bindForm, decorateIcons, wait }
export type { Result, Tone }
