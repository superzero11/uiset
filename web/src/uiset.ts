// UISet for Web Components and every framework that renders HTML: one module and one
// stylesheet. The skins, tokens and base styles dress UI SDK's own <ui-*> elements (they
// share the `data-slot` attributes the React components use), and UISet's primitives
// register as <uiset-*> elements through UI SDK's createParts.
import { installUISet } from "@/registry/uiset/ui/uiset/feedback"
import { orderLayers } from "@/registry/uiset/ui/uiset/layers"
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
import { defineContent } from "./content"
import { defineInlineEdit } from "./inline-edit"
import { defineTagInput } from "./tag-input"
import { definePhoneInput } from "./phone-input"
import { defineMaskedInput } from "./input-mask"
import { definePayments } from "./payments"
import { defineAddressFields } from "./address"
import { defineSortableList } from "./sortable-list"
import { defineSortableTree } from "./sortable-tree"
import { defineMotion, type UISetCrossfade, type UISetNumberTicker, type UISetTextReveal, type UISetThinking } from "./motion"
import { defineUpload } from "./upload"
import { defineSchemaForm } from "./schema-form"
import { defineTerminal } from "./terminal"
import "./web.css"
import type { UISetAgentConsole, UISetAgentStep, UISetAgentApprovals, UISetAgentActivity, UISetAgentSnapshot } from "./agent-console"
import type { UISetAppShell, UISetPageHeader, UISetEmptyState } from "./app-shell"
import type { BoardElement } from "./board"
import type { CanvasElement, UISetCanvasToolbar, UISetCanvasInspector } from "./canvas"
import type { UISetBarChart, UISetHeatmap, UISetLineChart, UISetScatterChart, UISetSegmentedBar } from "./chart"
import type { UISetChat, UISetChatComposer, UISetChatThreads, UISetChatModelPicker, UISetChatQueue, UISetChatUsage } from "./chat"
import type { UISetDataGrid } from "./data-grid"
import type { UISetFileTree, UISetEditorTabs, UISetCodeEditor, UISetCommandPalette, UISetProblems, UISetStatusBar } from "./ide"
import type { SwipeListElement, UISetWheel, UISetPullRefresh } from "./mobile"
import type { UISetRichText, UISetRichTextContent } from "./rich-text"
import type { ScheduleElement, UISetScheduleMonth } from "./schedule"
import type { UISetSearchField, UISetCopyButton, UISetStepper, UISetTextareaCount, UISetPasswordRules, UISetConfirmButton } from "./shell-parts"
import type { UISetSparkline, UISetStat } from "./stat"
import type { KnobElement, PatchBayElement } from "./studio"
import type { UISetAvatarGroup, UISetCodeBlock, UISetCodeTabs, UISetCountBadge, UISetPackageCommand, UISetTable } from "./content"
import type { InlineEditElement } from "./inline-edit"
import type { TagInputElement } from "./tag-input"
import type { PhoneInputElement } from "./phone-input"
import type { MaskedInputElement } from "./input-mask"
import type { UISetOrderSummary, UISetPayButton, UISetPaymentFields } from "./payments"
import type { AddressFieldsElement } from "./address"
import type { SortableListElement } from "./sortable-list"
import type { SortableTreeElement } from "./sortable-tree"
import type { UISetUpload } from "./upload"
import type { UISetSchemaForm } from "./schema-form"
import type { TerminalElement } from "./terminal"
import { ElementBase } from "./dom"

const skins = ["base", "blueprint", "studio", "phosphor", "ink"] as const

/**
 * The root every UISet page wraps itself in, like React's <UISet>:
 * <uiset-root skin="studio" theme="dark" sound> … </uiset-root>
 * motion="reduce" keeps fades and moves nothing, whatever the system setting says.
 * theme changes Base and generated skins; Blueprint, Studio and Phosphor stay dark, Ink light.
 */
class UISetRoot extends ElementBase {
  static observedAttributes = ["skin", "theme", "motion", "sound", "haptics"]
  connectedCallback() {
    // Stylesheets loaded after the module are on the page once an element connects.
    orderLayers()
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
    if (this.getAttribute("motion") === "reduce") this.setAttribute("data-motion", "reduce")
    else this.removeAttribute("data-motion")
    // "false" is what a framework writes for a false binding: off, like "off".
    const haptics = this.getAttribute("haptics")
    this.setAttribute("data-sound", sound !== null && sound !== "off" && sound !== "false" ? "on" : "off")
    this.setAttribute("data-haptics", haptics === "off" || haptics === "false" ? "off" : "on")
  }
}

function define() {
  if (typeof customElements === "undefined" || customElements.get("uiset-root")) return
  customElements.define("uiset-root", UISetRoot)
  installUISet()
  orderLayers()

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
  defineContent()
  defineInlineEdit()
  defineTagInput()
  definePhoneInput()
  defineMaskedInput()
  definePayments()
  defineAddressFields()
  defineSortableList()
  defineSortableTree()
  defineMotion()
  defineUpload()
  defineSchemaForm()
}

define()

// So `document.querySelector("uiset-data-grid")` and `createElement` know each element's
// properties. The kits made from UI SDK primitives are here as what a page sets and calls on
// them. Parts that only hold markup (the knob's, a jack, a row) are plain elements.
declare global {
  interface HTMLElementTagNameMap {
    "uiset-root": UISetRoot
    "uiset-agent-activity": UISetAgentActivity
    "uiset-agent-approvals": UISetAgentApprovals
    "uiset-agent-console": UISetAgentConsole
    "uiset-agent-snapshot": UISetAgentSnapshot
    "uiset-agent-step": UISetAgentStep
    "uiset-app-shell": UISetAppShell
    "uiset-avatar-group": UISetAvatarGroup
    "uiset-bar-chart": UISetBarChart
    "uiset-board": UISetBoard
    "uiset-canvas": UISetCanvas
    "uiset-canvas-inspector": UISetCanvasInspector
    "uiset-canvas-toolbar": UISetCanvasToolbar
    "uiset-chat": UISetChat
    "uiset-chat-composer": UISetChatComposer
    "uiset-chat-model-picker": UISetChatModelPicker
    "uiset-chat-threads": UISetChatThreads
    "uiset-chat-usage": UISetChatUsage
    "uiset-chat-queue": UISetChatQueue
    "uiset-code-block": UISetCodeBlock
    "uiset-code-editor": UISetCodeEditor
    "uiset-code-tabs": UISetCodeTabs
    "uiset-command-palette": UISetCommandPalette
    "uiset-copy-button": UISetCopyButton
    "uiset-count-badge": UISetCountBadge
    "uiset-data-grid": UISetDataGrid
    "uiset-editor-tabs": UISetEditorTabs
    "uiset-empty-state": UISetEmptyState
    "uiset-file-tree": UISetFileTree
    "uiset-heatmap": UISetHeatmap
    "uiset-inline-edit": UISetInlineEdit
    "uiset-tag-input": UISetTagInput
    "uiset-phone-input": UISetPhoneInput
    "uiset-masked-input": UISetMaskedInput
    "uiset-order-summary": UISetOrderSummary
    "uiset-payment-fields": UISetPaymentFields
    "uiset-pay-button": UISetPayButton
    "uiset-address-fields": UISetAddressFields
    "uiset-knob": UISetKnob
    "uiset-line-chart": UISetLineChart
    "uiset-package-command": UISetPackageCommand
    "uiset-page-header": UISetPageHeader
    "uiset-patch-bay": UISetPatchBay
    "uiset-problems": UISetProblems
    "uiset-pull-refresh": UISetPullRefresh
    "uiset-rich-text": UISetRichText
    "uiset-rich-text-content": UISetRichTextContent
    "uiset-scatter-chart": UISetScatterChart
    "uiset-schedule": UISetSchedule
    "uiset-schema-form": UISetSchemaForm
    "uiset-schedule-month": UISetScheduleMonth
    "uiset-search-field": UISetSearchField
    "uiset-segmented-bar": UISetSegmentedBar
    "uiset-sortable-list": UISetSortableList
    "uiset-sortable-tree": UISetSortableTree
    "uiset-number-ticker": UISetNumberTicker
    "uiset-text-reveal": UISetTextReveal
    "uiset-thinking": UISetThinking
    "uiset-crossfade": UISetCrossfade
    "uiset-sparkline": UISetSparkline
    "uiset-stat": UISetStat
    "uiset-status-bar": UISetStatusBar
    "uiset-stepper": UISetStepper
    "uiset-textarea-count": UISetTextareaCount
    "uiset-password-rules": UISetPasswordRules
    "uiset-confirm-button": UISetConfirmButton
    "uiset-swipe-list": UISetSwipeList
    "uiset-table": UISetTable
    "uiset-terminal": UISetTerminal
    "uiset-upload": UISetUpload
    "uiset-wheel": UISetWheel
  }
}

export type { WebColumn as UISetDataGridColumn } from "./data-grid"
// Each element's own events, for typing a listener a framework template holds:
// `(event: UISetKnobEvents["valuechange"]) => …`.
export type { UISetBoardEvents } from "./board"
export type { UISetCodeTabsEvents } from "./content"
export type { UISetInlineEditEvents } from "./inline-edit"
export type { UISetTagInputEvents } from "./tag-input"
export type { UISetPhoneInputEvents } from "./phone-input"
export type { UISetMaskedInputEvents } from "./input-mask"
export type { UISetOrderSummaryEvents, UISetPayButtonEvents, UISetPaymentFieldsEvents, PaymentValue } from "./payments"
export type { UISetAddressFieldsEvents } from "./address"
export type { AddressValue, AddressMessages, Region as AddressRegion } from "@/registry/uiset/ui/address/address"
export type { SortableListItemData as UISetSortableListItem, UISetSortableListEvents } from "./sortable-list"
export type { SortableTreeItemData as UISetSortableTreeItem, UISetSortableTreeEvents } from "./sortable-tree"
export type { UISetUploadEvents, UploadLabels as UISetUploadLabels } from "./upload"
export type { UISetSchemaFormEvents } from "./schema-form"
export type { UISetCanvasEvents } from "./canvas"
export type { UISetChartEvents } from "./chart"
export type { ChatQueuedMessage, UISetChatEvents, UISetChatComposerEvents, UISetChatModelPickerEvents, UISetChatQueueEvents, UISetChatThreadsEvents } from "./chat"
export type { UISetDataGridEvents } from "./data-grid"
export type { UISetCodeEditorEvents, UISetCommandPaletteEvents, UISetEditorTabsEvents, UISetFileTreeEvents, UISetProblemsEvents } from "./ide"
export type { UISetPullRefreshEvents, UISetSwipeListEvents } from "./mobile"
export type { UISetRichTextEvents } from "./rich-text"
export type { UISetScheduleEvents, UISetScheduleMonthEvents } from "./schedule"
export type { UISetSearchFieldEvents, UISetStepperEvents } from "./shell-parts"
export type { UISetKnobEvents, UISetPatchBayEvents } from "./studio"

// The names the kits made from primitives go by, beside the classes.
type UISetBoard = BoardElement
type UISetCanvas = CanvasElement
type UISetKnob = KnobElement
type UISetPatchBay = PatchBayElement
type UISetSchedule = ScheduleElement
type UISetSwipeList = SwipeListElement
type UISetTerminal = TerminalElement
type UISetInlineEdit = InlineEditElement
type UISetTagInput = TagInputElement
type UISetPhoneInput = PhoneInputElement
type UISetMaskedInput = MaskedInputElement
type UISetAddressFields = AddressFieldsElement
type UISetSortableList = SortableListElement
type UISetSortableTree = SortableTreeElement

export type {
  UISetAvatarGroup,
  UISetCrossfade,
  UISetNumberTicker,
  UISetTextReveal,
  UISetThinking,
  UISetCodeBlock,
  UISetCodeTabs,
  UISetCountBadge,
  UISetInlineEdit,
  UISetTagInput,
  UISetPhoneInput,
  UISetMaskedInput,
  UISetSortableList,
  UISetSortableTree,
  UISetPackageCommand,
  UISetTable,
  UISetUpload,
  UISetSchemaForm,
  UISetBarChart,
  UISetBoard,
  UISetCanvas,
  UISetHeatmap,
  UISetKnob,
  UISetLineChart,
  UISetPatchBay,
  UISetScatterChart,
  UISetSchedule,
  UISetSegmentedBar,
  UISetSwipeList,
  UISetTerminal,
  UISetAgentConsole,
  UISetAgentStep,
  UISetAgentApprovals,
  UISetAgentActivity,
  UISetAgentSnapshot,
  UISetAppShell,
  UISetPageHeader,
  UISetEmptyState,
  UISetCanvasToolbar,
  UISetCanvasInspector,
  UISetChat,
  UISetChatComposer,
  UISetChatThreads,
  UISetChatModelPicker,
  UISetChatQueue,
  UISetChatUsage,
  UISetDataGrid,
  UISetFileTree,
  UISetEditorTabs,
  UISetCodeEditor,
  UISetCommandPalette,
  UISetProblems,
  UISetStatusBar,
  UISetWheel,
  UISetPullRefresh,
  UISetRichText,
  UISetRichTextContent,
  UISetScheduleMonth,
  UISetSearchField,
  UISetCopyButton,
  UISetStepper,
  UISetTextareaCount,
  UISetPasswordRules,
  UISetConfirmButton,
  UISetSparkline,
  UISetStat,
  UISetOrderSummary,
  UISetPaymentFields,
  UISetPayButton,
  UISetAddressFields,
}
export { iconElement, iconPaths } from "@/registry/uiset/ui/shell/icon-paths"
// The schema form's definition, its checks, and the same definition as an agent tool.
export { defineForm, toJSONSchema, validateForm } from "@/registry/uiset/ui/schema-form/schema"
export { formTool, registerFormTool } from "@/registry/uiset/ui/schema-form/tool"
export type { FieldSpec, FormDefinition, FormErrors, FormValues, StandardSchemaV1 } from "@/registry/uiset/ui/schema-form/schema"
export type { FormTool, FormToolOptions, FormToolResult } from "@/registry/uiset/ui/schema-form/tool"
export type { SchemaFormLabels as UISetSchemaFormLabels } from "@/registry/uiset/ui/schema-form/labels"
export type { IconName } from "@/registry/uiset/ui/shell/icon-paths"
export { skins, UISetRoot }
