import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

declare global {
  var __UI_SDK_STRICT__: boolean | undefined
}
// Every UI SDK dev warning throws in the unit tests.
globalThis.__UI_SDK_STRICT__ = true

HTMLElement.prototype.showPopover = function () {}
HTMLElement.prototype.hidePopover = function () {}
Element.prototype.getAnimations = () => []
Element.prototype.scrollIntoView = function () {}
Element.prototype.checkVisibility = () => true
Element.prototype.getClientRects = () => [] as unknown as DOMRectList
// jsdom has no layout for ranges either; the rich text view measures the caret with one.
Range.prototype.getBoundingClientRect ??= () => new DOMRect()
Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList
document.elementFromPoint = () => null
// jsdom's ElementInternals has no form value or validity: form-associated web elements set both.
const attachInternals = HTMLElement.prototype.attachInternals
HTMLElement.prototype.attachInternals = function (this: HTMLElement) {
  const internals = (attachInternals?.call(this) ?? {}) as ElementInternals & Record<string, unknown>
  internals.setFormValue ??= () => {}
  internals.setValidity ??= () => {}
  internals.checkValidity ??= () => true
  internals.reportValidity ??= () => true
  return internals
}
document.elementsFromPoint = () => []
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
document.head.append(
  Object.assign(document.createElement("style"), {
    textContent: "[popover] { display: block !important }",
  }),
)

afterEach(cleanup)
