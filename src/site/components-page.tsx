import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react"
import { Toaster } from "@/registry/uiset/ui/toast"
import { exampleGroups, examples, type ExampleEntry } from "./examples"

// The gallery draws its first examples with the page and the rest as they come into view,
// with the others filling in a few at a time in the background, so opening the page doesn't
// wait for all of them. Every card's heading is there from the start, so a link to an example
// and find in page work: browsers keep a link's target in view as the cards above it draw.

const FIRST = 6
const BATCH = 6
const exampleId = (title: string) => `example-${title.toLowerCase().replace(/\W+/g, "-")}`

const loaded = new Map<string, ComponentType>()
const loadExample = (entry: ExampleEntry) =>
  entry.load().then((Component) => {
    loaded.set(entry.slug, Component)
    return Component
  })

/** Loads the examples drawn with the page (the router waits for this before showing it). */
function preloadGallery() {
  return Promise.all(examples.slice(0, FIRST).map(loadExample))
}

const initialWanted = () => new Set(examples.slice(0, FIRST).map((_, index) => index))

const Example = memo(function Example({ entry, index, wanted, onReady }: { entry: ExampleEntry; index: number; wanted: boolean; onReady: (index: number) => void }) {
  const [Component, setComponent] = useState<ComponentType | null>(() => loaded.get(entry.slug) ?? null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!wanted || Component) return
    let live = true
    loadExample(entry).then(
      (loadedComponent) => live && setComponent(() => loadedComponent),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [wanted, Component, entry])
  useEffect(() => {
    if (Component || failed) onReady(index)
  }, [Component, failed, index, onReady])

  const id = exampleId(entry.title)
  return (
    <section className="example" data-wide={entry.wide ? "" : undefined} data-index={index} data-ready={Component ? "" : undefined} aria-labelledby={id}>
      <header>
        <h3 id={id}>{entry.title}</h3>
        <p translate="no">{entry.parts}</p>
      </header>
      <div className="example-body">
        {Component ? <Component /> : <p className="example-note">{failed ? "The example didn’t load. Reload the page to try again." : "Loading the example…"}</p>}
      </div>
    </section>
  )
})

function ComponentsGallery() {
  const [wanted, setWanted] = useState(initialWanted)
  const [ready, setReady] = useState(() => new Set<number>())
  const gallery = useRef<HTMLDivElement>(null)
  const want = useCallback((indexes: number[]) => {
    setWanted((current) => (indexes.every((index) => current.has(index)) ? current : new Set([...current, ...indexes])))
  }, [])
  const onReady = useCallback((index: number) => {
    setReady((current) => (current.has(index) ? current : new Set(current).add(index)))
  }, [])

  // Cards near the viewport load before the rest.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => want(entries.filter((entry) => entry.isIntersecting).map((entry) => Number((entry.target as HTMLElement).dataset.index))),
      { rootMargin: "50% 0px" },
    )
    for (const card of gallery.current?.querySelectorAll<HTMLElement>(".example[data-index]") ?? []) observer.observe(card)
    return () => observer.disconnect()
  }, [want])

  // Once the wanted cards have drawn, the next few fill in while the browser is idle.
  const caughtUp = [...wanted].every((index) => ready.has(index))
  useEffect(() => {
    if (!caughtUp || wanted.size === examples.length) return
    const next = examples.map((_, index) => index).filter((index) => !wanted.has(index)).slice(0, BATCH)
    const idle = window.requestIdleCallback ?? ((run: () => void) => window.setTimeout(run, 50))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(() => want(next))
    return () => cancel(handle)
  }, [caughtUp, wanted, want])

  const complete = ready.size === examples.length

  // A link to an example stays on it as the cards above it draw, until the reader scrolls.
  // Chrome and Safari hold a link's target on their own; Firefox lets it drift.
  const pinned = useRef(window.location.hash.startsWith("#example-"))
  useEffect(() => {
    if (!pinned.current) return
    const release = () => void (pinned.current = false)
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const
    for (const name of events) window.addEventListener(name, release, { once: true, passive: true })
    return () => {
      for (const name of events) window.removeEventListener(name, release)
    }
  }, [])
  useLayoutEffect(() => {
    if (!pinned.current) return
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
    if (complete) pinned.current = false
  }, [ready, complete])

  let index = 0
  return (
    <div className="gallery" ref={gallery} data-ready={complete ? "" : undefined}>
      {exampleGroups.map((group) => (
        <Fragment key={group.title}>
          <h2 className="gallery-group">{group.title}</h2>
          {group.examples.map((entry) => {
            const at = index++
            return <Example key={entry.slug} entry={entry} index={at} wanted={wanted.has(at)} onReady={onReady} />
          })}
        </Fragment>
      ))}
      <Toaster />
    </div>
  )
}

export { ComponentsGallery, preloadGallery }
