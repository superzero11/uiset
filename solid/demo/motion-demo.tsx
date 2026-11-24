import { createSignal, For, onSettled } from "solid-js"
import { Button } from "../src/button"
import { Crossfade } from "../src/crossfade"
import { NumberTicker } from "../src/number-ticker"
import { SegmentedControl, SegmentedControlItem } from "../src/segmented-control"
import { TextReveal } from "../src/text-reveal"
import { Thinking } from "../src/thinking"

/** A figure that moves to each new value, and one that counts up when it's first seen. */
export function TickerExample() {
  const [revenue, setRevenue] = createSignal(12840)
  return (
    <div class="stack">
      <p class="example-strong">Revenue this month</p>
      <p class="motion-figure">
        <NumberTicker value={revenue()} format={{ style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }} />
      </p>
      <div class="row">
        <Button variant="outline" onClick={() => setRevenue((v) => v + 1290)}>
          Add a sale
        </Button>
        <Button variant="outline" onClick={() => setRevenue((v) => Math.max(0, v - 480))}>
          Refund one
        </Button>
      </div>
      <p class="example-note">
        Teams on UISet: <NumberTicker value={1284} from={0} />
      </p>
    </div>
  )
}

const answer =
  "Abort a fetch with an AbortController: pass its signal to fetch, then call abort() when the reader leaves. The request stops and its promise rejects with an AbortError, so catch that and move on."

/** An answer that streams in a few words at a time, each new one revealed. */
export function RevealExample() {
  const [shown, setShown] = createSignal(answer)
  let timer: ReturnType<typeof setInterval> | undefined
  const stream = () => {
    clearInterval(timer)
    const words = answer.split(" ")
    let count = 0
    setShown("")
    timer = setInterval(() => {
      count = Math.min(words.length, count + 3)
      setShown(words.slice(0, count).join(" "))
      if (count >= words.length) clearInterval(timer)
    }, 220)
  }
  onSettled(() => () => clearInterval(timer))
  return (
    <div class="stack">
      <p class="example-strong">An answer as it streams</p>
      <p class="motion-answer">
        <TextReveal>{shown()}</TextReveal>
      </p>
      <div class="row">
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
    <div class="stack">
      <p class="example-strong">While it works</p>
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
  const [plan, setPlan] = createSignal<keyof typeof plans>("pro")
  const shown = () => plans[plan()]
  return (
    <div class="stack">
      <p class="example-strong">Compare plans</p>
      <SegmentedControl aria-label="Plan" value={plan()} onValueChange={(v) => setPlan(v as keyof typeof plans)}>
        <SegmentedControlItem value="free">Free</SegmentedControlItem>
        <SegmentedControlItem value="pro">Pro</SegmentedControlItem>
        <SegmentedControlItem value="team">Team</SegmentedControlItem>
      </SegmentedControl>
      <Crossfade value={plan()} class="motion-plan">
        <div class="motion-plan-card">
          <p class="example-strong">{shown().title}</p>
          <ul>
            <For each={shown().lines}>{(line) => <li>{line}</li>}</For>
          </ul>
        </div>
      </Crossfade>
    </div>
  )
}

/** The Motion kit page: the four pieces side by side when there's room. */
export function MotionDemo() {
  return (
    <div class="motion-demo">
      <TickerExample />
      <RevealExample />
      <ThinkingExample />
      <CrossfadeExample />
    </div>
  )
}

export default MotionDemo
