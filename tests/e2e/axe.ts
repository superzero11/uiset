import Builder from "@axe-core/playwright"
import type { Page } from "@playwright/test"

/**
 * axe, once nothing is mid-transition. Under reduced motion a popup still fades in for 120ms,
 * and axe measuring contrast mid-fade reads its text as too faint (2026-11-20: the rich text
 * "/" menu in WebKit, the data grid's list in Chrome). Every e2e axe check comes through here.
 */
export default class AxeBuilder extends Builder {
  private readonly target: Page

  constructor(options: ConstructorParameters<typeof Builder>[0]) {
    super(options)
    this.target = options.page
  }

  override async analyze() {
    await this.target.waitForFunction(() =>
      document.getAnimations().every((a) => !(a instanceof CSSTransition) || a.playState !== "running"),
    )
    return super.analyze()
  }
}
