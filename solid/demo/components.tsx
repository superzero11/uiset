import { render, type JSX } from "@solidjs/web"
import { For, Show } from "solid-js"
import { groups } from "../../src/site/examples/meta"
import { Toaster } from "../src/toast"
import { DemoPage } from "./demo-page"
import "./examples.css"

// Every component in Solid, each in the example its React docs page shows (src/site/examples),
// grouped and titled as there.
const modules = import.meta.glob<{ default: () => JSX.Element }>("./examples/*.tsx", { eager: true })
const exampleOf = (slug: string) => modules[`./examples/${slug}.tsx`]?.default

function Components() {
  return (
    <DemoPage title="Components in Solid" description="UI SDK's components and UISet's own parts, written in Solid 2, in every skin.">
      <For each={groups.filter(([, metas]) => metas.some((meta) => exampleOf(meta.slug)))}>
        {([group, metas]) => (
          <section aria-labelledby={`group-${group}`} class="solid-demo-group">
            <h2 id={`group-${group}`}>{group}</h2>
            <div class="web-demo-grid">
              <For each={metas.filter((meta) => exampleOf(meta.slug))}>
                {(meta) => {
                  const Example = exampleOf(meta.slug)!
                  return (
                    <article class="example" data-ready="" data-wide={meta.wide ? "" : undefined} aria-labelledby={`example-${meta.slug}`}>
                      <header>
                        <h3 id={`example-${meta.slug}`}>{meta.title}</h3>
                        <p>{meta.parts}</p>
                      </header>
                      <div class="example-body">
                        <Example />
                      </div>
                    </article>
                  )
                }}
              </For>
            </div>
          </section>
        )}
      </For>
      <Show when={exampleOf("toast")}>
        <Toaster />
      </Show>
    </DemoPage>
  )
}

// The page's own count, for its browser test to check every example drew.
document.body.dataset.examples = String(groups.flatMap(([, metas]) => metas).filter((meta) => exampleOf(meta.slug)).length)
render(() => <Components />, document.getElementById("app")!)
