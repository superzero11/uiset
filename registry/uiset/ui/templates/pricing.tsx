"use client"

import { useState, type ReactNode } from "react"
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from "../accordion"
import { Badge } from "../badge"
import { Button } from "../button"
import { SegmentedControl, SegmentedControlItem } from "../segmented-control"
import { Icon } from "../shell/icons"
import { sampleComparison, samplePlans, sampleQuestions, type Plan } from "./pricing-sample"
import "./templates.css"

// A pricing section for a landing page: a monthly/yearly switch that every price follows,
// plan cards with one recommended, a comparison table people can read with a screen
// reader, and questions in an accordion. Plans, features and questions are data.

function PricingTemplate({
  plans = samplePlans,
  comparison = sampleComparison,
  questions = sampleQuestions,
  currency = "USD",
  locale = "en-US",
  heading = "Simple pricing that grows with you",
  lede = "Every plan includes unlimited viewers and our full API.",
}: {
  plans?: Plan[]
  comparison?: typeof sampleComparison
  questions?: { q: string; a: ReactNode }[]
  currency?: string
  locale?: string
  heading?: string
  lede?: ReactNode
}) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly")
  const money = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 })
  const price = (plan: Plan) => (billing === "monthly" ? plan.monthly : plan.yearly)
  // "Save n%" comes from the plans themselves: the best yearly saving on offer.
  const saving = Math.max(
    0,
    ...plans.map((p) => (p.monthly && p.yearly !== null ? Math.round((1 - p.yearly / p.monthly) * 100) : 0)),
  )

  return (
    <div className="pricing">
      <header className="pricing-header">
        <h1 className="pricing-title">{heading}</h1>
        {lede && <p className="pricing-lede">{lede}</p>}
        <SegmentedControl
          aria-label="Billing period"
          value={billing}
          onValueChange={(value) => value && setBilling(value as typeof billing)}
        >
          <SegmentedControlItem value="monthly">Monthly</SegmentedControlItem>
          <SegmentedControlItem value="yearly">
            Yearly{saving > 0 && <span className="pricing-save">save {saving}%</span>}
          </SegmentedControlItem>
        </SegmentedControl>
      </header>

      <ul className="pricing-plans" aria-label="Plans">
        {plans.map((plan) => {
          const amount = price(plan)
          return (
            <li key={plan.id} className="pricing-plan" data-recommended={plan.recommended ? "" : undefined}>
              <div className="pricing-plan-head">
                <h2 className="pricing-plan-name">{plan.name}</h2>
                {plan.recommended && <Badge tone="info">Most popular</Badge>}
              </div>
              <p className="pricing-plan-description">{plan.description}</p>
              <p className="pricing-price">
                {amount === null ? (
                  <>
                    <span className="pricing-amount">Custom</span>
                    <span className="pricing-per">priced for your team</span>
                  </>
                ) : (
                  <>
                    <span className="pricing-amount">{money.format(amount)}</span>
                    <span className="pricing-per">
                      {amount === 0 ? "forever" : `per seat a month${billing === "yearly" ? ", billed yearly" : ""}`}
                    </span>
                  </>
                )}
              </p>
              <Button
                render={<a href={plan.href} />}
                variant={plan.recommended ? "solid" : "outline"}
                className="pricing-cta"
                aria-label={`${plan.cta}: ${plan.name}`}
              >
                {plan.cta}
              </Button>
              <ul className="pricing-features" aria-label={`${plan.name} includes`}>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Icon name="check" />
                    {feature}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>

      <section className="pricing-compare" aria-labelledby="pricing-compare-title">
        <h2 id="pricing-compare-title" className="pricing-section-title">
          Compare plans
        </h2>
        <div className="pricing-table-scroller" role="region" aria-labelledby="pricing-compare-title" tabIndex={0}>
          <table className="pricing-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="uiset-visually-hidden">Feature</span>
                </th>
                {plans.map((plan) => (
                  <th key={plan.id} scope="col">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  {plans.map((plan) => {
                    const value = row.values[plan.id]
                    return (
                      <td key={plan.id}>
                        {value === true ? (
                          <>
                            <Icon name="check" />
                            <span className="uiset-visually-hidden">Included</span>
                          </>
                        ) : value === false || value === undefined ? (
                          <span className="pricing-no">
                            <span aria-hidden="true">–</span>
                            <span className="uiset-visually-hidden">Not included</span>
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pricing-faq" aria-labelledby="pricing-faq-title">
        <h2 id="pricing-faq-title" className="pricing-section-title">
          Questions
        </h2>
        <Accordion aria-label="Pricing questions">
          {questions.map((item, i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionHeader>
                <AccordionTrigger>{item.q}</AccordionTrigger>
              </AccordionHeader>
              <AccordionPanel>{item.a}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  )
}

export { PricingTemplate, samplePlans }
export type { Plan as PricingPlan }
