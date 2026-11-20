import { useEffect, useRef, useState } from "react"
import { Button } from "@/registry/uiset/ui/button"
import { Crossfade } from "@/registry/uiset/ui/crossfade"
import { NumberTicker } from "@/registry/uiset/ui/number-ticker"
import { SegmentedControl, SegmentedControlItem } from "@/registry/uiset/ui/segmented-control"
import { TextReveal } from "@/registry/uiset/ui/text-reveal"
import { Thinking } from "@/registry/uiset/ui/thinking"

/** A figure that moves to each new value, and one that counts up when it's first seen. */
export function TickerExample() {
  const [revenue, setRevenue] = useState(12840)
  return (
    <div className="stack">
      <p className="example-strong">Revenue this month</p>
      <p className="motion-figure">
        <NumberTicker value={revenue} format={{ style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }} />
      </p>
      <div className="row">
        <Button variant="outline" onClick={() => setRevenue((v) => v + 1290)}>
          Add a sale
        </Button>
        <Button variant="outline" onClick={() => setRevenue((v) => Math.max(0, v - 480))}>
          Refund one
        </Button>
      </div>
      <p className="example-note">
        Teams on UISet: <NumberTicker value={1284} from={0} />
      </p>
    </div>
  )
}

const answer =
  "Abort a fetch with an AbortController: pass its signal to fetch, then call abort() when the reader leaves. The request stops and its promise rejects with an AbortError, so catch that and move on."

/** An answer that streams in a few words at a time, each new one revealed. */
export function RevealExample() {
  const [shown, setShown] = useState(answer)
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  const stream = () => {
    clearInterval(timer.current)
    const words = answer.split(" ")
    let count = 0
    setShown("")
    timer.current = setInterval(() => {
      count = Math.min(words.length, count + 3)
      setShown(words.slice(0, count).join(" "))
      if (count >= words.length) clearInterval(timer.current)
    }, 220)
  }
  useEffect(() => () => clearInterval(timer.current), [])
  return (
    <div className="stack">
      <p className="example-strong">An answer as it streams</p>
      <p className="motion-answer">
        <TextReveal>{shown}</TextReveal>
      </p>
      <div className="row">
        <Button variant="outline" onClick={stream}>
          Stream the answer
        </Button>
      </div>
    </div>
  )
}

/** Waiting, said once to screen readers, shown in the skin's way. */
export function ThinkingExample() {
  return (
    <div className="stack">
      <p className="example-strong">While it works</p>
      <Thinking />
      <Thinking>Searching the docs…</Thinking>
    </div>
  )
}

const plans = {
  free: { title: "Free", lines: ["One project", "Community support"] },
  pro: { title: "Pro", lines: ["Unlimited projects", "Email support", "Version history", "Custom domains"] },
  team: { title: "Team", lines: ["Everything in Pro", "Shared workspaces", "Roles and permissions"] },
}

/** A plan's details swapped in place, the box moving to the new size. */
export function CrossfadeExample() {
  const [plan, setPlan] = useState<keyof typeof plans>("pro")
  const shown = plans[plan]
  return (
    <div className="stack">
      <p className="example-strong">Compare plans</p>
      <SegmentedControl aria-label="Plan" value={plan} onValueChange={(v) => setPlan(v as keyof typeof plans)}>
        <SegmentedControlItem value="free">Free</SegmentedControlItem>
        <SegmentedControlItem value="pro">Pro</SegmentedControlItem>
        <SegmentedControlItem value="team">Team</SegmentedControlItem>
      </SegmentedControl>
      <Crossfade value={plan} className="motion-plan">
        <div className="motion-plan-card">
          <p className="example-strong">{shown.title}</p>
          <ul>
            {shown.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </Crossfade>
    </div>
  )
}

/** The Motion kit page: the four pieces side by side when there's room. */
export function MotionDemo() {
  return (
    <div className="motion-demo">
      <TickerExample />
      <RevealExample />
      <ThinkingExample />
      <CrossfadeExample />
    </div>
  )
}

export default MotionDemo
