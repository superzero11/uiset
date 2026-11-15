// The Pricing section as web elements: a monthly/yearly switch every price follows, plan
// cards with one recommended, a comparison table, and questions in UI SDK's accordion. The
// plans are the React template's (templates/pricing-sample.ts).
import "@ui-sdk/web/accordion"
import "@ui-sdk/web/segmented-control"
import { createAgent } from "@ui-sdk/web/agent"
import { sampleComparison, samplePlans, sampleQuestions, type Plan } from "@/registry/uiset/ui/templates/pricing-sample"
import { h } from "../dom"
import { iconElement } from "../uiset"
import "./common"

let billing: "monthly" | "yearly" = "yearly"
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const price = (plan: Plan) => (billing === "monthly" ? plan.monthly : plan.yearly)
// "Save n%" comes from the plans themselves: the best yearly saving on offer.
const saving = Math.max(0, ...samplePlans.map((p) => (p.monthly && p.yearly !== null ? Math.round((1 - p.yearly / p.monthly) * 100) : 0)))
document.getElementById("saving")!.textContent = saving > 0 ? `save ${saving}%` : ""

function renderPlans() {
  document.getElementById("plans")!.replaceChildren(
    ...samplePlans.map((plan) => {
      const amount = price(plan)
      return h(
        "li",
        { class: "pricing-plan", "data-recommended": !!plan.recommended },
        h("div", { class: "pricing-plan-head" }, h("h2", { class: "pricing-plan-name" }, plan.name), plan.recommended ? h("span", { class: "badge", "data-tone": "info" }, "Most popular") : null),
        h("p", { class: "pricing-plan-description" }, plan.description),
        h(
          "p",
          { class: "pricing-price" },
          ...(amount === null
            ? [h("span", { class: "pricing-amount" }, "Custom"), h("span", { class: "pricing-per" }, "priced for your team")]
            : [h("span", { class: "pricing-amount" }, money.format(amount)), h("span", { class: "pricing-per" }, amount === 0 ? "forever" : `per seat a month${billing === "yearly" ? ", billed yearly" : ""}`)]),
        ),
        h("a", { href: plan.href, class: "pricing-cta", "data-slot": "button", "data-variant": plan.recommended ? "solid" : "outline", "aria-label": `${plan.cta}: ${plan.name}` }, plan.cta),
        h("ul", { class: "pricing-features", "aria-label": `${plan.name} includes` }, ...plan.features.map((feature) => h("li", null, iconElement("check"), feature))),
      )
    }),
  )
}

document.getElementById("compare")!.replaceChildren(
  h("thead", null, h("tr", null, h("th", { scope: "col" }, h("span", { class: "uiset-visually-hidden" }, "Feature")), ...samplePlans.map((plan) => h("th", { scope: "col" }, plan.name)))),
  h(
    "tbody",
    null,
    ...sampleComparison.map((row) =>
      h(
        "tr",
        null,
        h("th", { scope: "row" }, row.feature),
        ...samplePlans.map((plan) => {
          const value = row.values[plan.id]
          return h(
            "td",
            null,
            ...(value === true
              ? [iconElement("check"), h("span", { class: "uiset-visually-hidden" }, "Included")]
              : value === false || value === undefined
                ? [h("span", { class: "pricing-no" }, h("span", { "aria-hidden": "true" }, "–"), h("span", { class: "uiset-visually-hidden" }, "Not included"))]
                : [String(value)]),
          )
        }),
      ),
    ),
  ),
)

document.getElementById("faq")!.replaceChildren(
  ...sampleQuestions.map((item, i) =>
    h(
      "ui-accordion-item",
      { value: `q${i}` },
      h("ui-accordion-header", null, h("ui-accordion-trigger", null, h("button", { type: "button" }, item.q))),
      h("ui-accordion-panel", { hidden: true }, item.a),
    ),
  ),
)

document.getElementById("billing")!.addEventListener("valuechange", (event) => {
  const value = (event as CustomEvent<{ value: string | null }>).detail.value
  if (value === "monthly" || value === "yearly") billing = value
  renderPlans()
})
renderPlans()
Object.assign(window, { agent: createAgent() })
