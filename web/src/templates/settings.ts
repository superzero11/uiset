// The Settings page as web elements: six tabs that keep what you did as you switch, forms
// that save with a toast, sessions you sign out of, notification switches, plan usage,
// invoices, a team you invite to and remove from, and a workspace deletion that waits for
// its name. The account is the React template's (templates/settings-sample.ts).
import "@ui-sdk/web/alert-dialog"
import "@ui-sdk/web/avatar"
import "@ui-sdk/web/dialog"
import "@ui-sdk/web/meter"
import "@ui-sdk/web/password-input"
import "@ui-sdk/web/select"
import "@ui-sdk/web/switch"
import "@ui-sdk/web/tabs"
import "@ui-sdk/web/textarea"
import "@ui-sdk/web/toast"
import { toast } from "@ui-sdk/web"
import { createAgent } from "@ui-sdk/web/agent"
import { day, money, notificationGroups, sample, timezones, usage, type Invoice, type Member } from "@/registry/uiset/ui/templates/settings-sample"
import type { WebColumn } from "../data-grid"
import { h } from "../dom"
import { decorateIcons, wait } from "./common"

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
type Popup = HTMLElement & { open: boolean; api: { open: () => Promise<unknown>; close: () => boolean } }
type Grid = HTMLElement & { rows: unknown[]; columns: WebColumn[]; getRowId: (r: unknown) => string; sort: unknown; selected: string[]; focusGrid: () => void }
const badge = (tone: string, text: string) => h("span", { class: "badge", "data-tone": tone }, text)
decorateIcons()

// Every form saves its data and says so; a second press while saving does nothing.
for (const form of document.querySelectorAll<HTMLFormElement>("form[data-save]")) {
  const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!
  const label = button.textContent!
  let saving = false
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (saving) return
    saving = true
    button.setAttribute("aria-disabled", "true")
    button.textContent = "Saving…"
    await wait(400)
    toast(form.dataset.save!)
    saving = false
    button.removeAttribute("aria-disabled")
    button.textContent = label
  })
}
// Buttons that leave the page go to the app's billing portal.
for (const button of document.querySelectorAll<HTMLElement>("[data-action]")) button.addEventListener("click", () => toast(`${button.dataset.action!.replace("-", " ")}: connect onAction to your billing portal`))

/* ---------------------------------------------------------------- Profile */

const bio = $<HTMLTextAreaElement>("bio")
const count = () => ($("bio-count").textContent = `${bio.value.length} / 160`)
bio.addEventListener("input", count)
count()
$("timezone").querySelector("ui-select-content")!.replaceChildren(...timezones.map((zone) => h("ui-select-item", { value: zone }, zone.replace("_", " "))))

/* --------------------------------------------------------------- Security */

const twoStep = $("two-step")
twoStep.addEventListener("checkedchange", (event) => {
  const on = !!(event as CustomEvent<{ value: boolean }>).detail.value
  // Only turning it off needs a person's approval when an agent asks.
  if (on) twoStep.setAttribute("data-agent-confirm", "Turns off two-step verification")
  else twoStep.removeAttribute("data-agent-confirm")
  toast(on ? "Two-step verification is on" : "Two-step verification is off")
})

let sessions = [...sample.sessions]
function renderSessions() {
  const list = $("sessions")
  list.replaceChildren(
    ...sessions.map((s) =>
      h(
        "li",
        { class: "item" },
        h("span", { class: "item-text" }, h("span", { class: "item-title" }, s.device), h("span", { class: "item-description" }, `${s.where} · ${s.when}`)),
        s.current ? h("span", { class: "item-meta" }, badge("info", "This device")) : null,
        s.current
          ? null
          : h(
              "span",
              { class: "item-actions" },
              h(
                "ui-button",
                null,
                h(
                  "button",
                  {
                    type: "button",
                    "data-variant": "ghost",
                    "data-agent-confirm": `Signs you out on ${s.device}`,
                    onclick: () => {
                      // After signing out of a device, focus the next one's button (or the heading).
                      const index = sessions.filter((x) => !x.current).findIndex((x) => x.id === s.id)
                      sessions = sessions.filter((x) => x.id !== s.id)
                      renderSessions()
                      toast(`Signed out of ${s.device}`)
                      const buttons = list.querySelectorAll<HTMLElement>("button")
                      ;(buttons[Math.min(index, buttons.length - 1)] ?? list.closest("section")?.querySelector<HTMLElement>("h2"))?.focus()
                    },
                  },
                  `Sign out ${s.device}`,
                ),
              ),
            ),
      ),
    ),
  )
}
renderSessions()

/* ---------------------------------------------------------- Notifications */

$("notification-groups").replaceChildren(
  ...notificationGroups.map((group) =>
    h(
      "fieldset",
      { class: "settings-fieldset" },
      h("legend", null, group.channel),
      ...group.options.map((option) =>
        h("ui-field", { name: option.key, class: "settings-switch" }, h("ui-field-label", null, `${group.channel}: ${option.label}`), h("ui-switch", { name: option.key, "default-checked": option.on }, h("ui-switch-thumb"))),
      ),
    ),
  ),
)

/* ---------------------------------------------------------------- Billing */

$("usage").replaceChildren(
  ...usage.map((u) => {
    const meter = h(
      "ui-meter",
      { value: u.value, max: u.max, "aria-label": `${u.label} used`, "data-high": u.value / u.max >= 0.75 },
      h("span", { class: "settings-usage-label" }, u.label),
      h("ui-meter-value"),
      h("ui-meter-track", null, h("ui-meter-indicator")),
    ) as HTMLElement & { format: (value: number) => string }
    meter.format = (value) => `${value.toLocaleString("en-US")} of ${u.max.toLocaleString("en-US")} ${u.unit}`
    return meter
  }),
)
const invoices = $<Grid>("invoices")
invoices.columns = [
  { id: "id", header: "Invoice", value: (i) => (i as Invoice).id, width: 120 },
  { id: "date", header: "Date", type: "date", value: (i) => (i as Invoice).date, text: (i) => day.format((i as Invoice).date), width: 140 },
  { id: "amount", header: "Amount", type: "number", value: (i) => (i as Invoice).amount, text: (i) => money.format((i as Invoice).amount), width: 120 },
  { id: "status", header: "Status", value: (i) => (i as Invoice).status, render: (i) => badge((i as Invoice).status === "Paid" ? "success" : "warning", (i as Invoice).status), width: 110 },
]
invoices.getRowId = (i) => (i as Invoice).id
invoices.sort = [{ column: "date", direction: "descending" }]
invoices.rows = sample.invoices

/* ------------------------------------------------------------------- Team */

let members: Member[] = [...sample.members]
const grid = $<Grid>("members")
grid.columns = [
  { id: "name", header: "Name", value: (m) => (m as Member).name, width: 180, hideable: false },
  { id: "email", header: "Email", value: (m) => (m as Member).email, width: 220 },
  { id: "role", header: "Role", value: (m) => (m as Member).role, options: ["Admin", "Member"], editable: true, width: 120 },
  { id: "active", header: "Last active", value: (m) => (m as Member).active, width: 120 },
]
grid.getRowId = (m) => (m as Member).id
const chosen = () => members.filter((m) => grid.selected.includes(m.id) && m.role !== "Owner")
const who = () => (chosen().length === 1 ? chosen()[0]!.name : `${chosen().length} people`)
function renderTeam() {
  grid.rows = members
  $("team-count").textContent = `${members.length} people in ${sample.workspace}.`
}
// The owner stays: removing waits for someone else to be chosen.
const remove = $<HTMLButtonElement>("remove-members")
grid.addEventListener("selectedchange", () => queueMicrotask(() => (remove.parentElement as HTMLElement).toggleAttribute("disabled", chosen().length === 0)))
grid.addEventListener("celledit", (event) => {
  const { rowId, value } = (event as CustomEvent<{ rowId: string; value: unknown }>).detail
  if (members.find((m) => m.id === rowId)?.role === "Owner") {
    event.preventDefault()
    toast("The owner's role can't change. Make someone else owner first.")
    return
  }
  members = members.map((m) => (m.id === rowId ? { ...m, role: value as Member["role"] } : m))
  renderTeam()
  toast("Role changed")
})
const removeConfirm = $<Popup>("remove-confirm")
remove.addEventListener("click", () => {
  if (!chosen().length) return
  $("remove-title").textContent = `Remove ${who()} from the team?`
  const go = $("remove-go")
  go.textContent = `Remove ${who()}`
  go.setAttribute("data-agent-confirm", `Removes ${who()} from the team`)
  void removeConfirm.api.open().then(() => requestAnimationFrame(() => grid.focusGrid()))
})
$("remove-go").addEventListener("click", () => {
  const name = who()
  const gone = new Set(chosen().map((m) => m.id))
  members = members.filter((m) => !gone.has(m.id))
  grid.selected = []
  renderTeam()
  toast(`Removed ${name}`)
})

const invite = $<Popup>("invite")
const inviteForm = $<HTMLFormElement>("invite-form")
const inviteEmail = inviteForm.querySelector<HTMLInputElement>('input[name="invite-email"]')!
inviteEmail.addEventListener("input", () => inviteEmail.setCustomValidity(""))
inviteForm.addEventListener("submit", (event) => {
  event.preventDefault()
  const data = new FormData(inviteForm)
  const email = String(data.get("invite-email")).trim()
  if (members.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
    inviteEmail.setCustomValidity(`${email} is already on the team.`)
    inviteForm.reportValidity()
    return
  }
  members = [...members, { id: crypto.randomUUID(), name: email.split("@")[0]!, email, role: String(data.get("invite-role")) as Member["role"], active: "Invited" }]
  renderTeam()
  invite.api.close()
  inviteForm.reset()
  toast(`Invited ${email}`)
})
renderTeam()

/* -------------------------------------------------------------- Workspace */

const typed = $<HTMLInputElement>("confirm-name")
const forever = $<HTMLButtonElement>("delete-forever")
forever.disabled = true
typed.addEventListener("input", () => (forever.disabled = typed.value !== sample.workspace))
$("delete-workspace").addEventListener("openchange", (event) => {
  if (!(event as CustomEvent<{ value: boolean }>).detail.value) {
    typed.value = ""
    forever.disabled = true
  }
})
$("delete-forever").addEventListener("click", () => toast(`${sample.workspace} is scheduled for deletion`))

Object.assign(window, { agent: createAgent() })
