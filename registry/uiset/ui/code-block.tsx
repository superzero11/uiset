"use client"

import { usePreference } from "@ui-sdk/react/preferences"
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { tokenize, type Token } from "./code/highlight"
import { packageCommands, packageManager, type CodeTab, type PackageCommandOptions, type PackageManager } from "./code-block/commands"
import { CopyButton } from "./copy-button"
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "./scroll-area"
import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs"
import "./code/code.css"
import "./code-block/code-block.css"

const trimmed = (code: string) => code.replace(/\n$/, "")

/** The code's lines in its language's colors, once the highlighter has loaded. */
function useTokens(code: string, language: string | undefined) {
  const [tokens, setTokens] = useState<Token[][] | null>(null)
  useEffect(() => {
    let live = true
    setTokens(null)
    if (language)
      tokenize(code, language)
        .then((lines) => live && setTokens(lines))
        // An unknown language or a failed load leaves the code plain.
        .catch(() => {})
    return () => {
      live = false
    }
  }, [code, language])
  return tokens
}

type CodeOptions = {
  /** A shiki language, like "tsx" or "bash". Leave it out for plain text. */
  language?: string
  lineNumbers?: boolean
  /** Lines to mark, counted from 1. */
  highlight?: number[]
  /** Wrap long lines instead of scrolling sideways. */
  wrap?: boolean
  /** The tallest the code gets before it scrolls, like "20rem". */
  maxHeight?: string
}

function CodeLines({
  code,
  label,
  language,
  lineNumbers = false,
  highlight,
  wrap = false,
  maxHeight,
}: CodeOptions & { code: string; label: string }) {
  const text = trimmed(code)
  const tokens = useTokens(text, language)
  const lines: ReactNode[] =
    tokens?.map((line) =>
      line.map((token, index) => (
        <span key={index} style={token.color ? { color: token.color } : undefined}>
          {token.content}
        </span>
      )),
    ) ?? text.split("\n")
  return (
    <ScrollArea
      className="code-block-scroll"
      data-line-numbers={lineNumbers ? "" : undefined}
      data-wrap={wrap ? "" : undefined}
      style={{ "--code-block-max-height": maxHeight } as CSSProperties}
    >
      {/* A group, not a region: a page of code blocks shouldn't be a page of landmarks. */}
      <ScrollAreaViewport role="group" aria-label={label}>
        <ScrollAreaContent>
          <pre translate="no">
            <code>
              {/* Each newline sits between the lines, not inside one: a marked line is a
                  box of its own, and a newline inside it wouldn't break the row. */}
              {lines.map((line, index) => (
                <Fragment key={index}>
                  <span
                    className="code-line"
                    data-highlighted={highlight?.includes(index + 1) ? "" : undefined}
                  >
                    {line}
                  </span>
                  {index < lines.length - 1 ? "\n" : null}
                </Fragment>
              ))}
            </code>
          </pre>
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="horizontal">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
      <ScrollAreaScrollbar orientation="vertical">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    </ScrollArea>
  )
}

function CodeBlock({
  code,
  title,
  copy = true,
  className,
  ...options
}: CodeOptions & {
  code: string
  /** Shown above the code, like a file name. Without one the language shows. */
  title?: string
  /** Pass false for a block with no copy button. */
  copy?: boolean
  className?: string
}) {
  const name = title ?? options.language
  return (
    <figure className={["code-block", className].filter(Boolean).join(" ")}>
      {(name || copy) && (
        <figcaption className="code-block-head">
          <span className="code-block-title">{name}</span>
          {copy && (
            <CopyButton value={trimmed(code)} aria-label={`Copy ${title ?? "the code"}`} />
          )}
        </figcaption>
      )}
      <CodeLines code={code} label={title ? `${title} code` : "Code"} {...options} />
    </figure>
  )
}

/** Several versions of the same code, like one per package manager or per framework. */
function CodeTabs({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  ...options
}: Omit<CodeOptions, "language"> & {
  /** Names the row of tabs, like "Package manager". */
  label: string
  items: CodeTab[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
}) {
  const [own, setOwn] = useState(defaultValue ?? items[0]?.value)
  const current = value ?? own
  const active = items.find((item) => item.value === current) ?? items[0]
  return (
    <Tabs
      className={["code-block", className].filter(Boolean).join(" ")}
      value={active?.value}
      onValueChange={(next) => {
        if (typeof next !== "string") return
        setOwn(next)
        onValueChange?.(next)
      }}
    >
      <div className="code-block-head">
        <TabsList aria-label={label}>
          {items.map((item) => (
            <TabsTab key={item.value} value={item.value}>
              {item.label}
            </TabsTab>
          ))}
        </TabsList>
        {active && (
          <CopyButton value={trimmed(active.code)} aria-label={`Copy the ${active.label} code`} />
        )}
      </div>
      {items.map((item) => (
        <TabsPanel key={item.value} value={item.value}>
          <CodeLines
            code={item.code}
            language={item.language}
            label={`${item.label} code`}
            {...options}
          />
        </TabsPanel>
      ))}
    </Tabs>
  )
}

/** A package to install, or a package's command to run, with a tab per package manager. */
function PackageCommand({
  label = "Package manager",
  className,
  ...options
}: PackageCommandOptions & { label?: string; className?: string }) {
  const { value } = usePreference(packageManager)
  return (
    <CodeTabs
      wrap
      label={label}
      className={className}
      items={packageCommands(options)}
      value={value}
      onValueChange={(next) => packageManager.set(next as PackageManager)}
    />
  )
}

export { CodeBlock, CodeTabs, PackageCommand, packageCommands, packageManager }
export type { CodeTab, PackageManager }
