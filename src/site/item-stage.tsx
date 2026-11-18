import { Suspense, useRef, useState, type ReactNode } from "react"
import { announce } from "@ui-sdk/core"
import { Button } from "@/registry/uiset/ui/button"
import { Toaster } from "@/registry/uiset/ui/toast"
import { UISet } from "@/registry/uiset/ui/uiset"
import { AgentViewPanel, AgentViewSwitch, useAgentView } from "./agent-view"
import { useInstallText } from "./shell/code"
import { useSiteTheme } from "./shell/layout"
import { CopyIcon } from "./shell/site-icons"
import { useSkin } from "./shell/skin-picker"

// A kit's or template's live demo on its page: Agent view and Copy above it, the demo in the
// sidebar's skin, and with Agent view on, what an agent reads from it underneath.

/** The dark Copy button of a demo's toolbar. Named apart from the Installation section's
 *  "Copy the command to install …", which is on the same page. */
function CopyDark({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      className="site-copy-dark"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
        } catch {
          announce("Couldn't copy")
          return
        }
        setCopied(true)
        announce("Copied")
        setTimeout(() => setCopied(false), 1600)
      }}
    >
      <CopyIcon />
      <span>{copied ? "Copied" : "Copy"}</span>
    </Button>
  )
}

/** Copies the shadcn command that adds a kit or template. */
function CopyCommand({ items, name }: { items: string[]; name: string }) {
  return <CopyDark value={useInstallText(items)} label={`Copy the shadcn command for ${name}`} />
}

function ItemStage({ title, items, stageClass, sound, children }: { title: string; items: string[]; stageClass?: string; sound?: boolean; children: ReactNode }) {
  const { theme } = useSiteTheme()
  const [skin] = useSkin()
  const agentView = useAgentView()
  const stage = useRef<HTMLDivElement>(null)
  return (
    <section className="item-stage" aria-label={`${title} demo`}>
      <div className="docs-example-bar">
        <p className="item-stage-note">Live, in the {skin.charAt(0).toUpperCase() + skin.slice(1)} skin</p>
        <div className="docs-example-tools">
          <AgentViewSwitch />
          <CopyCommand items={items} name={title} />
        </div>
      </div>
      <div className="agent-view-frame" data-on={agentView ? "" : undefined}>
        <div className="agent-view-split">
          <UISet ref={stage} skin={skin} theme={theme} sound={sound} className={["item-frame", stageClass].filter(Boolean).join(" ")}>
            <Suspense fallback={<p className="example-note">Loading the demo…</p>}>{children}</Suspense>
          </UISet>
          {agentView && <AgentViewPanel root={stage} title={title} />}
        </div>
      </div>
      {/* Toasts take the demo's skin, not the site's. */}
      <UISet skin={skin} theme={theme} className="item-toasts">
        <Toaster />
      </UISet>
    </section>
  )
}

export { CopyCommand, CopyDark, ItemStage }
