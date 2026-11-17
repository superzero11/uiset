import { useEffect, useRef, useState } from "react"
import { Button } from "@/registry/uiset/ui/button"
import { CopyButton } from "@/registry/uiset/ui/copy-button"
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@/registry/uiset/ui/field"
import type { ReadinessSummary } from "@/registry/uiset/ui/agent-check/check"
import { ReadinessResult } from "../agent-check-demo"
import { usePageMeta } from "../shell/meta"

// The agent-readiness check for any public page: paste a link, and uiset.dev loads it in a
// browser (api/_agent-check/) and shows the report. ?url= in the address runs it, so a
// report can be shared.

type Checked = { url: string; finalUrl: string; title: string; report: ReadinessSummary }
type State = { status: "idle" } | { status: "checking"; address: string } | { status: "done"; checked: Checked } | { status: "failed"; error: string }

const addressFromLocation = () => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("url") ?? ""))

function CheckPage() {
  usePageMeta({
    title: "Agent readiness checker: can an agent use this page?",
    description:
      "Paste a link and see whether an AI agent can use the page: every control named, each name its own, nothing that only looks clickable. Free, for any public site; UI SDK apps are read through their agent bridge.",
    path: "/check",
  })
  const [address, setAddress] = useState(addressFromLocation)
  const [state, setState] = useState<State>({ status: "idle" })
  const running = useRef(0)

  const check = async (input: string) => {
    const wanted = input.trim()
    if (!wanted) {
      setState({ status: "failed", error: "Enter a web address, like example.com." })
      return
    }
    // The address goes in the page's own, so the report can be shared and the back button works.
    const params = new URLSearchParams(window.location.search)
    params.set("url", wanted)
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params}`)
    const run = ++running.current
    setState({ status: "checking", address: wanted })
    try {
      const response = await fetch(`/api/agent-check?url=${encodeURIComponent(wanted)}`)
      const body = (await response.json().catch(() => ({ error: "The checker didn't answer. Try again in a moment." }))) as Checked & { error?: string }
      if (run !== running.current) return
      setState(response.ok && !body.error ? { status: "done", checked: body } : { status: "failed", error: body.error ?? "The page couldn't be checked." })
    } catch {
      if (run === running.current) setState({ status: "failed", error: "The checker couldn't be reached. Check your connection and try again." })
    }
  }

  // A shared link checks its page as it opens, once: each check loads a page in a browser.
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current) return
    opened.current = true
    const shared = addressFromLocation()
    if (shared) void check(shared)
  }, [])

  const checking = state.status === "checking"
  return (
    <div className="page page-narrow check-page">
      <header className="page-head">
        <h1>Can an agent use this page?</h1>
        <p>
          Paste a link. The checker loads the page in a browser and reads it as an agent does: every control named, each name its own, and nothing that only looks
          clickable. A UI SDK app is read through its agent bridge.
        </p>
      </header>

      <form
        className="check-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!checking) void check(address)
        }}
      >
        <Field name="url" invalid={state.status === "failed" ? true : undefined} className="check-field">
          <FieldLabel>Page address</FieldLabel>
          <div className="check-row">
            <Input type="url" inputMode="url" autoComplete="url" placeholder="example.com" value={address} onValueChange={setAddress} />
            <Button type="submit" aria-disabled={checking || undefined}>
              {checking ? "Checking…" : "Check"}
            </Button>
          </div>
          <FieldDescription>Public pages only. For a page on your machine or behind a sign-in, use the bookmarklet or the command line.</FieldDescription>
          {state.status === "failed" && <FieldError match>{state.error}</FieldError>}
        </Field>
      </form>

      <section className="check-result" aria-live="polite" aria-busy={checking || undefined} aria-label="Report">
        {checking && <p className="check-status">Loading {state.address} in a browser and reading it. This takes about ten seconds.</p>}
        {state.status === "done" && (
          <>
            <div className="check-page-title">
              <h2>{state.checked.title || new URL(state.checked.finalUrl).host}</h2>
              <p>
                <a href={state.checked.finalUrl} rel="nofollow noopener noreferrer" target="_blank">
                  {state.checked.finalUrl}
                </a>
                {state.checked.report.mode === "bridge" ? ", read through its UI SDK agent bridge." : ", read from its accessibility tree."}
              </p>
            </div>
            <ReadinessResult report={state.checked.report} meterLabel={`Agent readiness of ${new URL(state.checked.finalUrl).host}`} />
            <div className="check-share">
              <CopyButton value={typeof window === "undefined" ? "" : window.location.href} label="Copy" aria-label="Copy a link to this report" />
              <span>Share this report: the link checks the page again when it opens.</span>
            </div>
          </>
        )}
      </section>

      <section className="check-more" aria-labelledby="check-more-title">
        <h2 id="check-more-title">Check pages the checker can&rsquo;t reach</h2>
        <p>
          The <a href="/agents#agent-check">bookmarklet</a> checks the page you&rsquo;re on, on localhost or behind a sign-in, in your own browser. In tests and CI,{" "}
          <a href="/docs/agent-check">agent-check</a> runs the same check from Vitest, Playwright or the command line. The checker keeps each address&rsquo;s report for ten
          minutes, so the same link loads fast.
        </p>
      </section>
    </div>
  )
}

export default CheckPage
