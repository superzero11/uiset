import { Suspense, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react"
import { announce } from "@ui-sdk/core"
import { Button } from "@/registry/uiset/ui/button"
import { UISet, type Skin } from "@/registry/uiset/ui/uiset"
import { examples } from "./examples"
import type { Card, components } from "./library"
import { kitDemos, templateDemos } from "./library-demos"
import { useInstallText } from "./shell/code"
import { useSiteTheme } from "./shell/layout"
import { CopyIcon } from "./shell/site-icons"
import { SkinSample } from "./skins-demo"

// A card of the library: the live piece as its preview, drawn in the chosen skin, inert and
// hidden from agents (it's a picture; its page has the one to use), its name, one line, and
// a button that copies its install command. The whole card opens its page.

/** Whether an element is on screen or close to it, once: a card's preview loads when it's near. */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    if (typeof IntersectionObserver === "undefined") return setSeen(true)
    const watch = new IntersectionObserver(([entry]) => entry?.isIntersecting && setSeen(true), { rootMargin: "50% 0px" })
    watch.observe(el)
    return () => watch.disconnect()
  }, [seen])
  return [ref, seen] as const
}

/** A window onto a kit or a page: its top-left at about 0.6×, large enough to read as a screen. */
type View = { width?: number; height?: number; /** How far in from the left and top the window starts. */ x?: number; y?: number }

function Scaled({ children, width = 520, height = 800, x = 0, y = 0 }: View & { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = new ResizeObserver(([entry]) => entry && setScale(entry.contentRect.width / (width - x)))
    fit.observe(el)
    return () => fit.disconnect()
  }, [width, x])
  return (
    <div ref={box} className="lib-window">
      <div className="lib-window-page" style={{ width, height, marginInlineStart: -x, marginBlockStart: -y, zoom: scale }}>
        {children}
      </div>
    </div>
  )
}

function CopyInstall({ card }: { card: Card }) {
  const command = useInstallText(card.items)
  const [copied, setCopied] = useState(false)
  return (
    // For a person: a page of 77 has names that nest ("Alert", "Alert dialog"), and an agent
    // installs from the item's page, which has the command.
    <Button
      variant="ghost"
      className="lib-card-copy"
      data-agent-hidden=""
      aria-label={`Copy the command to install ${card.title}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(command)
        } catch {
          announce("Couldn't copy")
          return
        }
        setCopied(true)
        announce("Copied")
        setTimeout(() => setCopied(false), 1600)
      }}
    >
      {copied ? (
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="m4.5 10.5 3.5 3.5 7.5-8" />
        </svg>
      ) : (
        <CopyIcon />
      )}
    </Button>
  )
}

function LibraryCard({ card, skin, preview }: { card: Card; skin: Skin; preview: (skin: Skin) => ReactNode }) {
  const { theme } = useSiteTheme()
  const [stage, seen] = useSeen<HTMLDivElement>()
  return (
    <article className="lib-card">
      <div ref={stage} className="lib-card-stage">
        <div className="lib-card-preview" inert aria-hidden="true" data-agent-hidden="">
          {seen && (
            <UISet skin={skin} theme={theme} className="lib-card-skin">
              <Suspense>{preview(skin)}</Suspense>
            </UISet>
          )}
        </div>
        {card.tag && <span className="lib-card-tag">{card.tag}</span>}
      </div>
      <div className="lib-card-foot">
        <div className="lib-card-info">
          <h2 className="lib-card-title">
            <a href={card.href}>{card.title}</a>
          </h2>
          <p className="lib-card-desc">{card.description}</p>
        </div>
        <CopyInstall card={card} />
      </div>
    </article>
  )
}

const exampleComponents = new Map<string, ComponentType>()
function ExamplePreview({ slug }: { slug: string }) {
  const entry = examples.find((e) => e.slug === slug)
  const [Component, setComponent] = useState<ComponentType | null>(() => exampleComponents.get(slug) ?? null)
  useEffect(() => {
    if (Component || !entry) return
    let live = true
    entry.load().then((loaded) => {
      exampleComponents.set(slug, loaded)
      if (live) setComponent(() => loaded)
    })
    return () => {
      live = false
    }
  }, [Component, entry, slug])
  return Component ? (
    <Fit>
      <Component />
    </Fit>
  ) : null
}

/**
 * Scales an example to the stage below the tag: a tall form or an app frame shrinks to fit, a
 * small part grows a little (to 1.25×), so each reads at a similar size and none is cut off.
 */
function Fit({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const scaler = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const [b, s, c] = [box.current, scaler.current, content.current]
    if (!b || !s || !c) return
    let zoom = 1
    // Measured as drawn, then divided by the scale: changing the scale to measure would make
    // an example that sizes itself from its box (the image cropper) redraw, and loop.
    let narrowed = false
    const fit = () => {
      // Laid out at a gallery card's width (as the examples are made); a small part (avatars,
      // badges) then has its box narrowed to what it fills, so it centers and grows.
      if (!narrowed) {
        const box0 = c.getBoundingClientRect()
        const reach = Math.max(0, ...[...c.querySelectorAll("*")].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 1 && r.height > 1).map((r) => r.right - box0.left))
        if (reach > 0 && reach < box0.width - 12) {
          c.style.width = `${Math.ceil(reach / zoom) + 2}px`
          narrowed = true
        }
      }
      const drawn = c.getBoundingClientRect()
      if (!drawn.width || !drawn.height) return
      const [width, height] = [drawn.width / zoom, drawn.height / zoom]
      const next = Math.min(1.25, Math.max(0.5, Math.min((b.clientWidth * 0.88) / width, b.clientHeight / height)))
      if (Math.abs(next - zoom) < 0.03) return
      zoom = next
      s.style.zoom = String(next)
    }
    const watch = new ResizeObserver(fit)
    watch.observe(b)
    watch.observe(c)
    // Once the example has drawn, only the card's own size changes the fit.
    const settled = setTimeout(() => watch.unobserve(c), 1500)
    return () => {
      clearTimeout(settled)
      watch.disconnect()
    }
  }, [])
  return (
    <div ref={box} className="lib-fit">
      <div ref={scaler}>
        <div ref={content} className="lib-example">
          {children}
        </div>
      </div>
    </div>
  )
}

type Kind = "component" | "kit" | "template" | "theme"

/** What a card of this kind shows as its preview. */
function previewOf(kind: Kind, card: Card): (skin: Skin) => ReactNode {
  if (kind === "component") {
    const slug = (card as (typeof components)[number]).example
    return () => (slug ? <ExamplePreview slug={slug} /> : null)
  }
  if (kind === "kit") {
    const Demo = kitDemos[card.id]
    // A few read better with their own view: the chat as its thread, past its list of chats.
    const view: View = ({ chat: { width: 760, x: 250 }, canvas: { width: 600 }, "agent-console": { width: 900 } } as Record<string, View>)[card.id] ?? {}
    return () => (Demo ? <Scaled {...view}>{<Demo />}</Scaled> : null)
  }
  if (kind === "template") {
    const Demo = templateDemos[card.id]
    // The inbox needs the room for its three columns.
    const view: View = ({ inbox: { width: 820 } } as Record<string, View>)[card.id] ?? { width: 640 }
    return () => (Demo ? <Scaled {...view}>{<Demo />}</Scaled> : null)
  }
  // A theme shows the gallery's small form in its skin, fitted below the tag like an example.
  return () => (
    <Fit>
      <SkinSample />
    </Fit>
  )
}


export { LibraryCard, previewOf }
export type { Kind }
