import { useEffect, useRef, useState, type ComponentProps, type ComponentType } from "react"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"
import { Toaster } from "@/registry/uiset/ui/toast"
import { AgentViewPanel, AgentViewSwitch, useAgentView } from "../agent-view"
import { displaySource, exampleMetas, exampleSlugByItem, usesOf, type ExampleMeta } from "../examples/meta"
import { CodeBlock, InstallCommand } from "../shell/code"
import { SkinPicker } from "../shell/skin-picker"
import { docPages } from "./nav"

// A component's live example, its source, and, with Agent view on, what an agent reads from
// it, on its docs page. Only this item's example module loads.

const modules = import.meta.glob<{ default: ComponentType }>("../examples/*.tsx")
const sources = import.meta.glob<string>("../examples/*.tsx", { query: "?raw", import: "default" })

type Example = {
  meta: ExampleMeta
  ready: { Component: ComponentType; source: string } | null
  failed: boolean
}

/** Loads an item's example. */
function useExample(item: string): Example | null {
  const slug = exampleSlugByItem.get(item)
  const meta = exampleMetas.find((m) => m.slug === slug)
  const [ready, setReady] = useState<{ slug: string; Component: ComponentType; source: string } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!slug) return
    let live = true
    const path = `../examples/${slug}.tsx`
    setFailed(false)
    Promise.all([modules[path]!(), sources[path]!()]).then(
      ([module, source]) => live && setReady({ slug, Component: module.default, source }),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [slug])

  if (!meta) return null
  return { meta, ready: ready?.slug === meta.slug ? ready : null, failed }
}

function ExamplePreview({
  example,
  item,
  skin,
  theme,
  onSkinChange,
}: {
  example: Example
  item: string
  skin: Skin
  theme: ComponentProps<typeof UISet>["theme"]
  onSkinChange: (skin: Skin) => void
}) {
  const { meta, ready } = example
  const agentView = useAgentView()
  const stage = useRef<HTMLDivElement>(null)
  const uses = ready ? usesOf(ready.source) : [item]
  const others = uses.filter((name) => !meta.items.includes(name))

  return (
    <Tabs defaultValue="preview" className="docs-example">
      <div className="docs-example-bar">
        <TabsList aria-label={`${meta.title} example`}>
          <TabsTab value="preview">Preview</TabsTab>
          <TabsTab value="code">Code</TabsTab>
        </TabsList>
        <div className="docs-example-tools">
          <AgentViewSwitch />
          <SkinPicker value={skin} onChange={onSkinChange} />
        </div>
      </div>
      <TabsPanel value="preview">
        <div className="agent-view-frame" data-on={agentView ? "" : undefined}>
          <div className="agent-view-split">
            <UISet ref={stage} skin={skin} theme={theme} className="docs-preview">
              <div className="example" data-wide={meta.wide ? "" : undefined}>
                <div className="example-body">
                  {ready ? <ready.Component /> : <p className="example-note">{example.failed ? "The example didn\u2019t load. Reload the page to try again." : "Loading the example\u2026"}</p>}
                </div>
              </div>
              {uses.includes("toast") && <Toaster />}
            </UISet>
            {agentView && ready && <AgentViewPanel root={stage} title={meta.title} />}
          </div>
        </div>
      </TabsPanel>
      <TabsPanel value="code">
        {ready ? <CodeBlock code={displaySource(ready.source)} language="tsx" title={`${meta.slug}-example.tsx`} /> : <p className="example-note">Loading the code…</p>}
        {others.length > 0 && (
          <div className="docs-example-uses">
            <p>
              This example also uses{" "}
              {others.map((name, i) => (
                <span key={name}>
                  {i > 0 && (i === others.length - 1 ? " and " : ", ")}
                  {docPages.some((p) => p.item === name) ? <a href={`/docs/components/${name}`}>{name}</a> : <code>{name}</code>}
                </span>
              ))}
              . Install everything it needs:
            </p>
            <InstallCommand items={uses} label={`Install what the ${meta.title} example uses`} />
          </div>
        )}
      </TabsPanel>
    </Tabs>
  )
}

export { ExamplePreview, useExample }
export type { Example }
