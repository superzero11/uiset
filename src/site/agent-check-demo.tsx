import { useEffect, useRef, useState } from "react"
import { showAgentReadiness } from "@/registry/uiset/ui/agent-check/overlay"
import { checkAgentReadiness, type AgentReadinessReport } from "@/registry/uiset/ui/agent-check/check"
import { Avatar, AvatarFallback } from "@/registry/uiset/ui/avatar"
import { Badge } from "@/registry/uiset/ui/badge"
import { Button } from "@/registry/uiset/ui/button"
import { CopyButton } from "@/registry/uiset/ui/copy-button"
import { Field, FieldLabel, Input } from "@/registry/uiset/ui/field"
import { Meter } from "@/registry/uiset/ui/meter"
import { Icon } from "@/registry/uiset/ui/shell/icons"
import { Switch } from "@/registry/uiset/ui/switch"
import { UISet } from "@/registry/uiset/ui/uiset"
import { agent } from "./agent"
import bookmarklet from "./generated/agent-check-bookmarklet"
import { useSiteTheme } from "./shell/layout"

// The agent-readiness check on the page it's on: a small report form that can carry three
// mistakes, and the real check run through the site's own agent bridge.

/**
 * The form, with or without its mistakes. Each is one an agent meets and a person doesn't: an
 * avatar that reads its initials to a person but has no name for the bridge, a name inside
 * another, and a plain button the bridge doesn't list.
 */
function RevenueReport({ mistakes }: { mistakes: boolean }) {
  return (
    <div className="readiness-form">
      <div className="readiness-heading">
        <h3>Revenue report</h3>
        <Avatar key={mistakes ? "owner-nameless" : "owner"} {...(mistakes ? {} : { role: "img", "aria-label": "Owner: Ada Lovelace" })}>
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
      </div>
      <div className="readiness-fields">
        <Field name="country">
          <FieldLabel>Country</FieldLabel>
          <Input defaultValue="Germany" />
        </Field>
        <Field name="revenue">
          {/* "Country" is a word of this name, so a step by "Country" finds both fields. */}
          <FieldLabel>{mistakes ? "Revenue by country" : "Revenue"}</FieldLabel>
          <Input defaultValue="€1.2M" />
        </Field>
      </div>
      <div className="readiness-actions">
        <Button variant="outline" aria-label="Refresh the report">
          <Icon name="retry" />
        </Button>
        {mistakes ? (
          // A native button: a person can press it, the agent bridge doesn't list it.
          <button key="export-plain" type="button" className="readiness-plain-button">
            Export CSV
          </button>
        ) : (
          <Button key="export" variant="outline">
            Export CSV
          </Button>
        )}
      </div>
    </div>
  )
}

/** The bookmarklet as a link: a statement that runs the bundle and returns nothing, so the page stays. */
const bookmarkletHref = `javascript:${encodeURIComponent(`(function(){${bookmarklet}})();void 0`)}`

/**
 * The check for any page: a bookmarklet to drag to the bookmarks bar (React won't render a
 * javascript: link, so its address is set once it's on the page), and the command line.
 */
function CheckAnyPage() {
  const link = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    link.current?.setAttribute("href", bookmarkletHref)
  }, [])
  return (
    <div className="readiness-anywhere">
      <div className="readiness-anywhere-text">
        <h3>Check any page</h3>
        <p>
          Drag the bookmarklet to your bookmarks bar, then click it on any page, yours on localhost included. It asks the page&rsquo;s UI SDK bridge when it finds one
          (<code>window.agent</code>), reads the page&rsquo;s accessibility tree when not, and shows the report on the page.
        </p>
      </div>
      <div className="readiness-anywhere-actions">
        <a ref={link} className="readiness-bookmarklet" draggable onClick={(event) => event.preventDefault()}>
          Check agent readiness
        </a>
        <CopyButton value={bookmarkletHref} label="Copy" aria-label="Copy the bookmarklet's address, to paste as a bookmark's URL" />
        <Button variant="outline" onClick={() => void showAgentReadiness({ agent })}>
          Try it on this page
        </Button>
      </div>
      <p className="readiness-anywhere-cli">
        Or from a terminal, for any URL: <code>npx tsx components/ui/agent-check/cli.ts https://your-site.com</code>
      </p>
    </div>
  )
}

function AgentCheckDemo() {
  const { theme } = useSiteTheme()
  const [mistakes, setMistakes] = useState(true)
  const [report, setReport] = useState<AgentReadinessReport | null>(null)
  const [checking, setChecking] = useState(false)
  const checked = useRef(false)

  const run = async () => {
    setChecking(true)
    try {
      setReport(await checkAgentReadiness(agent))
      checked.current = true
    } finally {
      setChecking(false)
    }
  }

  // Once checked, the report follows the form: the components it shows have joined the bridge
  // by the frame after it renders.
  useEffect(() => {
    if (!checked.current) return
    const frame = requestAnimationFrame(() => void run())
    return () => cancelAnimationFrame(frame)
  }, [mistakes])

  const errors = report?.problems.filter((problem) => problem.severity === "error").length ?? 0
  return (
    <div className="readiness-stage">
      <UISet skin="base" theme={theme} className="console-target">
        <RevenueReport mistakes={mistakes} />
      </UISet>
      <div className="readiness-panel">
        <div className="readiness-controls">
          <Field name="mistakes" className="readiness-switch">
            <Switch checked={mistakes} onCheckedChange={(on) => setMistakes(on === true)} />
            <FieldLabel>Put mistakes in the form</FieldLabel>
          </Field>
          <Button onClick={() => void run()} aria-disabled={checking || undefined}>
            Check this page
          </Button>
        </div>
        <div className="readiness-result" aria-live="polite">
          {report ? (
            <>
              <p className="readiness-score">
                <span className="readiness-number">{report.score}</span>
                <span>/100</span>
              </p>
              <Meter value={report.score} aria-label="Agent readiness of this page" />
              <p>
                {report.ready} of {report.controls} controls on this page an agent can find by name.{" "}
                {errors ? `${errors} ${errors === 1 ? "problem" : "problems"} to fix:` : "Nothing to fix."}
              </p>
              {report.problems.length > 0 && (
                <ul className="readiness-problems">
                  {report.problems.map((problem, index) => (
                    <li key={`${problem.kind}-${index}`}>
                      <Badge tone={problem.severity === "error" ? "danger" : "warning"}>{problem.severity === "error" ? "Error" : "Warning"}</Badge>
                      <span>{problem.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="readiness-empty">The check asks this page&rsquo;s agent bridge what an agent sees, and scores it.</p>
          )}
        </div>
      </div>
      <CheckAnyPage />
    </div>
  )
}

export { AgentCheckDemo }
