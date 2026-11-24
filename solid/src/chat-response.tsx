import { Dynamic, type JSX } from "@solidjs/web"
import { announce } from "@ui-sdk/core"
import { Toggle } from "@ui-sdk/solid/toggle"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import remend from "remend"
import { createEffect, createMemo, createSignal, createUniqueId, For, Match, Show, Switch } from "solid-js"
import { unified } from "unified"
import { Button } from "./button"
import { ChatIcon, chatIcons } from "./chat"
import { ScrollBox } from "./scroll-area"
import { tokenize, type Token } from "../../registry/uiset/ui/code/highlight"
import { attributeName, messageId } from "../../registry/uiset/ui/chat/hast"
import { safeUrl, sameOriginImages } from "../../registry/uiset/ui/chat/urls"
import "../../registry/uiset/ui/chat/chat.css"
import "../../registry/uiset/ui/code/code.css"

function ChatCodeBlock(props: { code: string; language?: string; filename?: string }) {
  // Colors are kept with the code they're for: code still streaming in shows plain until its
  // own colors come, never in the colors of what it was a moment ago.
  const [loaded, setLoaded] = createSignal<{ code: string; language: string; lines: Token[][] } | null>(null)
  createEffect(
    () => ({ code: props.code, language: props.language }),
    (asked) => {
      let live = true
      if (asked.language)
        tokenize(asked.code, asked.language)
          .then((lines) => live && lines && setLoaded({ code: asked.code, language: asked.language!, lines }))
          .catch(() => {})
      return () => {
        live = false
      }
    },
  )
  const tokens = () => {
    const was = loaded()
    return was && was.code === props.code && was.language === props.language ? was.lines : null
  }
  const [wrap, setWrap] = createSignal(false)
  const [copied, setCopied] = createSignal(false)
  const copy = async () => {
    await navigator.clipboard.writeText(props.code)
    setCopied(true)
    announce("Copied")
    setTimeout(() => setCopied(false), 1600)
  }
  const title = () => props.filename ?? props.language ?? "Code"
  return (
    <figure class="chat-code" data-wrap={wrap() ? "" : undefined}>
      <figcaption class="chat-code-header">
        <span translate="no">{title()}</span>
        <span class="chat-code-actions">
          <Toggle aria-label="Wrap lines" pressed={wrap()} onPressedChange={(next) => setWrap(next)} class="chat-code-toggle">
            Wrap
          </Toggle>
          <Button variant="ghost" aria-label={`Copy ${title()}`} onClick={copy}>
            <ChatIcon path={copied() ? chatIcons.check : chatIcons.copy} />
          </Button>
        </span>
      </figcaption>
      <ScrollBox axis="x" data-frame="none" dir="ltr" class="chat-code-scroll" viewport={{ role: "region", "aria-label": title() }}>
        <pre>
          <code translate="no">
            <Show when={tokens()} fallback={props.code}>
              {(lines) => (
                <For each={lines()} keyed={false}>
                  {(line) => (
                    <span class="chat-code-line">
                      <For each={line()} keyed={false}>
                        {(token) => <span style={token().color ? { color: token().color } : undefined}>{token().content}</span>}
                      </For>
                      {"\n"}
                    </span>
                  )}
                </For>
              )}
            </Show>
          </code>
        </pre>
      </ScrollBox>
    </figure>
  )
}

// The answer's Markdown as an HTML tree (hast), through the same remark parser React's
// react-markdown and the Web Components chat use. Without `allowDangerousHtml`, remark-rehype
// leaves raw HTML out of the tree: model output is untrusted, so it's never rendered.
type HastElement = { type: "element"; tagName: string; properties?: Record<string, unknown>; children: HastNode[] }
type HastText = { type: "text"; value: string }
type HastNode = HastElement | HastText | { type: "comment" | "raw" | "doctype"; value?: string }

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)
const parse = (text: string) => (processor.runSync(processor.parse(text)) as unknown as { children: HastNode[] }).children

type Context = {
  allowImage: (url: URL) => boolean
  /** Footnote ids unique to this answer, so one message's links don't jump to another's. */
  idPrefix: string
}

const voids = new Set(["br", "hr", "img", "input", "col", "wbr"])


function attributes(element: HastElement, context: Context) {
  const out: Record<string, string | boolean> = {}
  for (const [name, value] of Object.entries(element.properties ?? {})) {
    if (value === false || value == null) continue
    const attribute = attributeName(name)
    if (value === true) {
      out[attribute] = true
      continue
    }
    let text = Array.isArray(value) ? value.join(" ") : String(value)
    if (attribute === "href") {
      // Links only to safe places: http, https, mailto or relative, never `javascript:`.
      const safe = safeUrl(text)
      if (safe === null) continue
      text = safe
    }
    text = messageId(attribute, text, context.idPrefix)
    if (attribute === "class") text = text.replace(/\bsr-only\b/, "chat-visually-hidden")
    out[attribute] = text
  }
  return out
}

const isExternal = (href: unknown) => typeof href === "string" && /^https?:\/\//i.test(href)

/**
 * An image from the model. A remote one could carry what the model read to someone else's
 * server in its address, so unless `allowImage` lets it load, it's a link the person can follow.
 */
function ResponseImage(props: { element: HastElement; allowImage: (url: URL) => boolean }) {
  const alt = () => String(props.element.properties?.alt ?? "")
  const url = () => {
    const src = safeUrl(String(props.element.properties?.src ?? ""), ["data", "blob"])
    try {
      return src ? new URL(src, globalThis.location?.href ?? "http://localhost/") : null
    } catch {
      return null
    }
  }
  return (
    <Switch fallback={alt() || null}>
      <Match when={url() && props.allowImage(url()!) && url()}>{(shown) => <img src={shown().href} alt={alt()} loading="lazy" decoding="async" />}</Match>
      <Match when={url() && /^https?:$/.test(url()!.protocol) && url()}>
        {(link) => (
          <a href={link().href} target="_blank" rel="noopener noreferrer" class="chat-image-link">
            Image: {alt() || link().hostname}
            <span class="chat-visually-hidden"> (opens in a new tab)</span>
          </a>
        )}
      </Match>
    </Switch>
  )
}

/** A fenced block: <pre><code class="language-ts">…</code></pre>, as a code block. */
function fenced(element: HastElement) {
  if (element.tagName !== "pre") return null
  const code = element.children.find((child): child is HastElement => child.type === "element" && child.tagName === "code")
  if (!code) return null
  const classes = (code.properties?.className as string[] | undefined) ?? []
  const language = classes.find((name) => name.startsWith("language-"))?.slice("language-".length)
  const text = code.children.map((child) => (child as HastText).value ?? "").join("")
  return { code: text.replace(/\n$/, ""), language }
}

function Element(props: { element: HastElement; context: Context }) {
  const tag = () => props.element.tagName
  const children = () => (voids.has(tag()) ? undefined : <Nodes nodes={props.element.children} context={props.context} />)
  return (
    <Switch fallback={<Dynamic component={tag()} {...attributes(props.element, props.context)} children={children()} />}>
      <Match when={fenced(props.element)}>{(block) => <ChatCodeBlock code={block().code} language={block().language} />}</Match>
      <Match when={tag() === "img"}>
        <ResponseImage element={props.element} allowImage={props.context.allowImage} />
      </Match>
      <Match when={tag() === "table"}>
        <ScrollBox axis="x" data-frame="none" class="chat-table" viewport={{ role: "region", "aria-label": "Table" }}>
          <table {...attributes(props.element, props.context)}>
            <Nodes nodes={props.element.children} context={props.context} />
          </table>
        </ScrollBox>
      </Match>
      <Match when={tag() === "a"}>
        <a {...attributes(props.element, props.context)} {...(isExternal(props.element.properties?.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          <Nodes nodes={props.element.children} context={props.context} />
          <Show when={isExternal(props.element.properties?.href)}>
            <span class="chat-visually-hidden"> (opens in a new tab)</span>
          </Show>
        </a>
      </Match>
    </Switch>
  )
}

// Nodes keep their place as the answer streams: the same position updates in place, as React
// reconciles it, so a code block keeps its Wrap and a selection isn't thrown away per token.
function Nodes(props: { nodes: HastNode[]; context: Context }) {
  return (
    <For each={props.nodes} keyed={false}>
      {(node) => (
        <Switch>
          <Match when={node().type === "text" && (node() as HastText)}>{(text) => <>{text().value}</>}</Match>
          <Match when={node().type === "element" && (node() as HastElement)}>{(element) => <Element element={element()} context={props.context} />}</Match>
        </Switch>
      )}
    </For>
  )
}

function ChatResponse(props: {
  children: string
  streaming?: boolean
  /** Which images in answers load. Same-origin, data: and blob: by default; others are links. */
  allowImage?: (url: URL) => boolean
}) {
  // While it streams, half-written Markdown is completed (remend), so a bold or a code fence
  // doesn't flash as raw marks.
  const nodes = createMemo(() => parse(props.streaming ? remend(props.children) : props.children))
  const context: Context = {
    get allowImage() {
      return props.allowImage ?? sameOriginImages
    },
    idPrefix: createUniqueId(),
  }
  return (
    <div class="chat-response">
      <Nodes nodes={nodes()} context={context} />
    </div>
  )
}

export { ChatCodeBlock, ChatResponse }
