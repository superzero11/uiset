"use client"

import { announce } from "@ui-sdk/core"
import { Toggle } from "@ui-sdk/react/toggle"
import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remend from "remend"
import { Button } from "./button"
import { ChatIcon, chatIcons } from "./chat"
import { tokenize, type Token } from "./code/highlight"
import { ScrollBox } from "./scroll-area"
import "./chat/chat.css"
import "./code/code.css"

function ChatCodeBlock({
  code,
  language,
  filename,
}: {
  code: string
  language?: string
  filename?: string
}) {
  const [tokens, setTokens] = useState<Token[][] | null>(null)
  const [wrap, setWrap] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let current = true
    if (!language) return
    tokenize(code, language)
      .then((result) => current && setTokens(result))
      .catch(() => current && setTokens(null))
    return () => {
      current = false
    }
  }, [code, language])

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    announce("Copied")
    setTimeout(() => setCopied(false), 1600)
  }

  const title = filename ?? language ?? "Code"

  return (
    <figure className="chat-code" data-wrap={wrap ? "" : undefined}>
      <figcaption className="chat-code-header">
        <span translate="no">{title}</span>
        <span className="chat-code-actions">
          <Toggle
            aria-label="Wrap lines"
            pressed={wrap}
            onPressedChange={setWrap}
            className="chat-code-toggle"
          >
            Wrap
          </Toggle>
          <Button variant="ghost" aria-label={`Copy ${title}`} onClick={copy}>
            <ChatIcon path={copied ? chatIcons.check : chatIcons.copy} />
          </Button>
        </span>
      </figcaption>
      <ScrollBox
        axis="x"
        data-frame="none"
        dir="ltr"
        className="chat-code-scroll"
        viewport={{ role: "region", "aria-label": title }}
      >
        <pre>
          <code translate="no">
            {tokens
              ? tokens.map((line, index) => (
                  <span key={index} className="chat-code-line">
                    {line.map((token, j) => (
                      <span
                        key={j}
                        style={token.color ? { color: token.color } : undefined}
                      >
                        {token.content}
                      </span>
                    ))}
                    {"\n"}
                  </span>
                ))
              : code}
          </code>
        </pre>
      </ScrollBox>
    </figure>
  )
}

const components: Components = {
  pre: ({ children }) => {
    const child = Children.toArray(children)[0]
    if (!isValidElement(child)) return <pre>{children}</pre>
    const { className, children: text } = (
      child as ReactElement<{ className?: string; children?: ReactNode }>
    ).props
    const language = /language-([\w+#-]+)/.exec(className ?? "")?.[1]
    return (
      <ChatCodeBlock code={String(text ?? "").replace(/\n$/, "")} language={language} />
    )
  },
  a: ({ href, children }) => {
    const external = href ? /^https?:\/\//.test(href) : false
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
        {external && <span className="chat-visually-hidden"> (opens in a new tab)</span>}
      </a>
    )
  },
  table: ({ children }) => (
    <ScrollBox axis="x" data-frame="none" className="chat-table" viewport={{ role: "region", "aria-label": "Table" }}>
      <table>{children}</table>
    </ScrollBox>
  ),
}

/** Same-origin, data: and blob: images load; remote ones wait for the page to allow them. */
const sameOriginImages = (url: URL) =>
  url.origin === globalThis.location?.origin || url.protocol === "data:" || url.protocol === "blob:"

/**
 * An image from the model. A remote one could carry what the model read to someone else's
 * server in its address, so unless `allowImage` lets it load, it's a link the person can follow.
 */
function ResponseImage({ src, alt, allowImage }: { src?: string; alt?: string; allowImage: (url: URL) => boolean }) {
  let url: URL | null = null
  try {
    url = src ? new URL(src, globalThis.location?.href ?? "http://localhost/") : null
  } catch {
    url = null
  }
  if (url && allowImage(url)) return <img src={url.href} alt={alt ?? ""} loading="lazy" />
  if (url && /^https?:$/.test(url.protocol))
    return (
      <a href={url.href} target="_blank" rel="noopener noreferrer" className="chat-image-link">
        Image: {alt || url.hostname}
        <span className="chat-visually-hidden"> (opens in a new tab)</span>
      </a>
    )
  return alt ? <>{alt}</> : null
}

// Raw HTML in the markdown is shown as text, never rendered: model output is untrusted.
// Links go through react-markdown's own URL check, which drops `javascript:` and the like.
function ChatResponse({
  children,
  streaming = false,
  allowImage = sameOriginImages,
}: {
  children: string
  streaming?: boolean
  /** Which images in answers load. Same-origin, data: and blob: by default; others are links. */
  allowImage?: (url: URL) => boolean
}) {
  const withImages = useMemo<Components>(
    () => ({ ...components, img: ({ src, alt }) => <ResponseImage src={typeof src === "string" ? src : undefined} alt={alt} allowImage={allowImage} /> }),
    [allowImage],
  )
  return (
    <div className="chat-response">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={withImages} skipHtml>
        {streaming ? remend(children) : children}
      </ReactMarkdown>
    </div>
  )
}

export { ChatCodeBlock, ChatResponse }
