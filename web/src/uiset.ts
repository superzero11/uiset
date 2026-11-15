// UISet for Web Components and every framework that renders HTML: one module and one
// stylesheet. The skins, tokens and base styles dress UI SDK's own <ui-*> elements (they
// share the `data-slot` attributes the React components use), and UISet's primitives
// register as <uiset-*> elements through UI SDK's createParts.
import { installUISet } from "@/registry/uiset/ui/uiset/feedback"
import "@/registry/uiset/ui/uiset/uiset.css"
import "@/registry/uiset/ui/shell/shell.css"
import { defineAgentConsole } from "./agent-console"
import { defineAppShell } from "./app-shell"
import { defineShellParts } from "./shell-parts"
import { defineBoard } from "./board"
import { defineCanvas } from "./canvas"
import { defineCharts } from "./chart"
import { defineChat } from "./chat"
import { defineDataGrid } from "./data-grid"
import { defineIde } from "./ide"
import { defineMobile } from "./mobile"
import { defineRichText } from "./rich-text"
import { defineSchedule } from "./schedule"
import { defineStat } from "./stat"
import { defineStudio } from "./studio"
import { defineTerminal } from "./terminal"
import "./web.css"

const skins = ["base", "blueprint", "studio", "phosphor", "ink"] as const

/**
 * The root every UISet page wraps itself in, like React's <UISet>:
 * <uiset-root skin="studio" theme="dark" sound> … </uiset-root>
 */
class UISetRoot extends HTMLElement {
  static observedAttributes = ["skin", "theme", "sound", "haptics"]
  connectedCallback() {
    this.sync()
  }
  attributeChangedCallback() {
    this.sync()
  }
  private sync() {
    const theme = this.getAttribute("theme")
    const sound = this.getAttribute("sound")
    this.setAttribute("data-uiset", "")
    this.setAttribute("data-skin", this.getAttribute("skin") || "base")
    if (theme === "light" || theme === "dark") this.setAttribute("data-theme", theme)
    else this.removeAttribute("data-theme")
    this.setAttribute("data-sound", sound !== null && sound !== "off" ? "on" : "off")
    this.setAttribute("data-haptics", this.getAttribute("haptics") === "off" ? "off" : "on")
  }
}

function define() {
  if (typeof customElements === "undefined" || customElements.get("uiset-root")) return
  customElements.define("uiset-root", UISetRoot)
  installUISet()

  defineStudio()

  defineMobile()
  defineBoard()
  defineCharts()
  defineDataGrid()
  defineChat()
  defineSchedule()
  defineCanvas()
  defineIde()
  defineAgentConsole()
  defineTerminal()
  defineStat()
  defineAppShell()
  defineShellParts()
  defineRichText()
}

define()

export { iconElement, iconPaths } from "@/registry/uiset/ui/shell/icon-paths"
export type { IconName } from "@/registry/uiset/ui/shell/icon-paths"
export { skins, UISetRoot }
