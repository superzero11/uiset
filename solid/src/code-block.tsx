import { usePreference } from "@ui-sdk/solid/preferences"
import { createEffect, createMemo, createSignal, For, Show, type Accessor } from "solid-js"
import { tokenize, type Token } from "../../registry/uiset/ui/code/highlight"
import { packageCommands, packageManager, type CodeTab, type PackageCommandOptions, type PackageManager } from "../../registry/uiset/ui/code-block/commands"
import { CopyButton } from "./copy-button"
import { ScrollArea, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from "./scroll-area"
import { Tabs, TabsList, TabsPanel, TabsTab } from "./tabs"
import "../../registry/uiset/ui/code/code.css"
import "../../registry/uiset/ui/code-block/code-block.css"

const trimmed = (code: string) => code.replace(/\n$/, "")

/** The code's lines in its language's colors, once the highlighter has loaded. */
function useTokens(code: Accessor<string>, language: Accessor<string | undefined>) {
  // The colors are kept with the code and language they're for, so new code shows plain
  // until its own colors arrive, never in the old code's.
  const [loaded, setLoaded] = createSignal<{ code: string; language: string; lines: Token[][] } | null>(null)
  createEffect(
    () => ({ code: code(), language: language() }),
    (asked) => {
      let live = true
      if (asked.language)
        tokenize(asked.code, asked.language)
          .then((lines) => live && lines && setLoaded({ code: asked.code, language: asked.language!, lines }))
          // An unknown language or a failed load leaves the code plain.
          .catch(() => {})
      return () => {
        live = false
      }
    },
  )
  return () => {
    const was = loaded()
    return was && was.code === code() && was.language === language() ? was.lines : null
  }
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

function CodeLines(props: CodeOptions & { code: string; label: string }) {
  const text = () => trimmed(props.code)
  const tokens = useTokens(text, () => props.language)
  const lines = createMemo<(string | Token[])[]>(() => tokens() ?? text().split("\n"))
  return (
    <ScrollArea
      class="code-block-scroll"
      data-line-numbers={props.lineNumbers ? "" : undefined}
      data-wrap={props.wrap ? "" : undefined}
      style={{ "--code-block-max-height": props.maxHeight }}
    >
      {/* A group, not a region: a page of code blocks shouldn't be a page of landmarks. */}
      <ScrollAreaViewport role="group" aria-label={props.label}>
        <ScrollAreaContent>
          <pre translate="no">
            <code>
              {/* Each newline sits between the lines, not inside one: a marked line is a
                  box of its own, and a newline inside it wouldn't break the row. */}
              <For each={lines()} keyed={false}>
                {(line, index) => (
                  <>
                    <span class="code-line" data-highlighted={props.highlight?.includes(index + 1) ? "" : undefined}>
                      {typeof line() === "string" ? (
                        (line() as string)
                      ) : (
                        <For each={line() as Token[]} keyed={false}>
                          {(token) => <span style={token().color ? { color: token().color } : undefined}>{token().content}</span>}
                        </For>
                      )}
                    </span>
                    {index < lines().length - 1 ? "\n" : null}
                  </>
                )}
              </For>
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

function CodeBlock(
  props: CodeOptions & {
    code: string
    /** Shown above the code, like a file name. Without one the language shows. */
    title?: string
    /** Pass false for a block with no copy button. */
    copy?: boolean
    class?: string
  },
) {
  const name = () => props.title ?? props.language
  const copy = () => props.copy !== false
  return (
    <figure class={["code-block", props.class]}>
      <Show when={name() || copy()}>
        <figcaption class="code-block-head">
          <span class="code-block-title">{name()}</span>
          <Show when={copy()}>
            <CopyButton value={trimmed(props.code)} aria-label={`Copy ${props.title ?? "the code"}`} />
          </Show>
        </figcaption>
      </Show>
      <CodeLines
        code={props.code}
        label={props.title ? `${props.title} code` : "Code"}
        language={props.language}
        lineNumbers={props.lineNumbers}
        highlight={props.highlight}
        wrap={props.wrap}
        maxHeight={props.maxHeight}
      />
    </figure>
  )
}

/** Several versions of the same code, like one per package manager or per framework. */
function CodeTabs(
  props: Omit<CodeOptions, "language"> & {
    /** Names the row of tabs, like "Package manager". */
    label: string
    items: CodeTab[]
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
    class?: string
  },
) {
  const [own, setOwn] = createSignal(() => props.defaultValue)
  const active = () => {
    const current = props.value ?? own() ?? props.items[0]?.value
    return props.items.find((item) => item.value === current) ?? props.items[0]
  }
  return (
    <Tabs
      class={["code-block", props.class]}
      value={active()?.value}
      onValueChange={(next) => {
        if (typeof next !== "string") return
        setOwn(next)
        props.onValueChange?.(next)
      }}
    >
      <div class="code-block-head">
        <TabsList aria-label={props.label}>
          <For each={props.items} keyed={(item) => item.value}>
            {(item) => <TabsTab value={item().value}>{item().label}</TabsTab>}
          </For>
        </TabsList>
        <Show when={active()}>{(item) => <CopyButton value={trimmed(item().code)} aria-label={`Copy the ${item().label} code`} />}</Show>
      </div>
      <For each={props.items} keyed={(item) => item.value}>
        {(item) => (
          <TabsPanel value={item().value}>
            <CodeLines
              code={item().code}
              language={item().language}
              label={`${item().label} code`}
              lineNumbers={props.lineNumbers}
              highlight={props.highlight}
              wrap={props.wrap}
              maxHeight={props.maxHeight}
            />
          </TabsPanel>
        )}
      </For>
    </Tabs>
  )
}

/** A package to install, or a package's command to run, with a tab per package manager. */
function PackageCommand(props: PackageCommandOptions & { label?: string; class?: string }) {
  const chosen = usePreference(packageManager)
  const items = createMemo(() => packageCommands(props.install !== undefined ? { install: props.install, dev: props.dev } : { run: props.run! }))
  return (
    <CodeTabs
      wrap
      label={props.label ?? "Package manager"}
      class={props.class}
      items={items()}
      value={chosen().value}
      onValueChange={(next) => packageManager.set(next as PackageManager)}
    />
  )
}

export { CodeBlock, CodeTabs, PackageCommand, packageCommands, packageManager }
export type { CodeTab, PackageManager }
