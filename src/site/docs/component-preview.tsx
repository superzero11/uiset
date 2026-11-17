import { useCallback, useEffect, useRef, useState, type ComponentProps, type ComponentType } from "react"
import { announce } from "@ui-sdk/core"
import type { AgentComponent } from "@ui-sdk/react/agent"
import { Button } from "@/registry/uiset/ui/button"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/registry/uiset/ui/tabs"
import { Toaster } from "@/registry/uiset/ui/toast"
import { agent } from "../agent"
import { displaySource, exampleMetas, exampleSlugByItem, usesOf, type ExampleMeta } from "../examples/meta"
import { CodeBlock, InstallCommand } from "../shell/code"
import { SkinPicker } from "../shell/skin-picker"
import { docPages } from "./nav"

// A component's live example, its source, and what an agent reads from it, on its docs page.
// Only this item's example module loads.

const modules = import.meta.glob<{ default: ComponentType }>("../examples/*.tsx")
const sources = import.meta.glob<string>("../examples/*.tsx", { query: "?raw", import: "default" })

type Example = {
  meta: ExampleMeta
  ready: { Component: ComponentType; source: string } | null
  failed: boolean
  // Bridge refs that were on the page before the example drew: the site's own controls.
  before: Set<string>
}

/** Loads an item's example (and remembers what the page held before it, for AgentView). */
function useExample(item: string): Example | null {
  const slug = exampleSlugByItem.get(item)
  const meta = exampleMetas.find((m) => m.slug === slug)
  const [ready, setReady] = useState<{ slug: string; Component: ComponentType; source: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const before = useRef(new Set<string>())

  useEffect(() => {
    if (!slug) return
    let live = true
    before.current = new Set(agent.snapshot().map((c) => c.ref))
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
  return { meta, ready: ready?.slug === meta.slug ? ready : null, failed, before: before.current }
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
  const uses = ready ? usesOf(ready.source) : [item]
  const others = uses.filter((name) => !meta.items.includes(name))

  return (
    <Tabs defaultValue="preview" className="docs-example">
      <div className="docs-example-bar">
        <TabsList aria-label={`${meta.title} example`}>
          <TabsTab value="preview">Preview</TabsTab>
          <TabsTab value="code">Code</TabsTab>
        </TabsList>
        <SkinPicker value={skin} onChange={onSkinChange} />
      </div>
      <TabsPanel value="preview">
        <UISet skin={skin} theme={theme} className="docs-preview">
          <div className="example" data-wide={meta.wide ? "" : undefined}>
            <div className="example-body">
              {ready ? <ready.Component /> : <p className="example-note">{example.failed ? "The example didn\u2019t load. Reload the page to try again." : "Loading the example\u2026"}</p>}
            </div>
          </div>
          {uses.includes("toast") && <Toaster />}
        </UISet>
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

/** The example as UI SDK's agent bridge reads it: each component's kind, name, state and actions. */
function AgentView({ example }: { example: Example }) {
  const [entries, setEntries] = useState<Omit<AgentComponent, "source">[] | null>(null)
  const snapshot = useCallback(
    () =>
      agent
        .snapshot()
        .filter((c) => !c.offPage && c.ref !== "more" && !example.before.has(c.ref))
        .map(({ source: _source, ...rest }) => rest),
    [example.before],
  )
  const read = useCallback(() => setEntries(snapshot()), [snapshot])

  const loaded = !!example.ready
  useEffect(() => {
    if (!loaded) return
    // Components register as they mount; give the example a moment to finish drawing.
    const timer = window.setTimeout(read, 400)
    return () => window.clearTimeout(timer)
  }, [loaded, read])

  if (!entries) return <p className="example-note">Reading the example…</p>
  if (!entries.length) return <p>This example has no controls of its own for an agent to use: it shows content, which an agent reads as page text.</p>
  return (
    <div className="docs-agent-view">
      <p>
        This is <code>agent.snapshot()</code> for the example above, read live from this page. Change something in the example, then read it again: the values follow.
      </p>
      <CodeBlock code={JSON.stringify(entries, null, 2)} language="json" title="agent.snapshot()" />
      <Button
        variant="outline"
        onClick={() => {
          read()
          announce("Read the example again")
        }}
      >
        Read it again
      </Button>
    </div>
  )
}

export { AgentView, ExamplePreview, useExample }
export type { Example }
