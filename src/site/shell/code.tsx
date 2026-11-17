import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react"
import { CopyButton } from "@/registry/uiset/ui/copy-button"
import { SegmentedControl, SegmentedControlItem } from "@/registry/uiset/ui/segmented-control"
import { tokenize, type Token } from "@/registry/uiset/ui/code/highlight"

// Code on the site: highlighted blocks and install commands, each with a copy button.

const ordinals = ["", "second ", "third ", "fourth ", "fifth ", "sixth ", "seventh ", "eighth ", "ninth ", "tenth "]

/**
 * The copy button's name: its file name, or else the heading it sits under, since agents find
 * a button by name alone and a page can hold many blocks in one language. A heading over
 * several blocks of one language counts them: "Copy the second vue code under "Data in"".
 */
function useCopyName(figure: RefObject<HTMLElement | null>, language: string | undefined, title: string | undefined) {
  const what = language ? `${language} code` : "code"
  const [name, setName] = useState(title ? `Copy ${title}` : `Copy the ${what}`)
  useEffect(() => {
    const el = figure.current
    if (title || !el) return
    const after = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    const scope = el.closest("main") ?? document
    const heading = Array.from(scope.querySelectorAll("h1, h2, h3"))
      .filter((h) => after(h, el))
      .at(-1)
    if (!heading) return
    const before = Array.from(scope.querySelectorAll<HTMLElement>("figure.code-block:not([data-titled])")).filter(
      (other) => other.dataset.language === (language ?? "") && after(heading, other) && after(other, el),
    ).length
    setName(`Copy the ${ordinals[before] ?? `${before + 1}th `}${what} under "${heading.textContent?.trim()}"`)
  }, [figure, language, title])
  return name
}

/** A block of code with its language's colors, an optional file name and a copy button. */
function CodeBlock({ code, language, title, className }: { code: string; language?: string; title?: string; className?: string }) {
  const figure = useRef<HTMLElement>(null)
  const copyName = useCopyName(figure, language, title)
  const [tokens, setTokens] = useState<Token[][] | null>(null)
  useEffect(() => {
    let live = true
    setTokens(null)
    if (language) tokenize(code.replace(/\n$/, ""), language).then((t) => live && setTokens(t)).catch(() => {})
    return () => {
      live = false
    }
  }, [code, language])
  const lines = code.replace(/\n$/, "").split("\n")
  return (
    <figure ref={figure} className={["code-block", className].filter(Boolean).join(" ")} data-language={language ?? ""} data-titled={title ? "" : undefined}>
      <figcaption className="code-block-head">
        <span className="code-block-title">{title ?? language ?? "Code"}</span>
        <CopyButton value={code.replace(/\n$/, "")} label="Copy" aria-label={copyName} />
      </figcaption>
      <pre translate="no" tabIndex={0} role="region" aria-label={title ? `${title} code` : "Code"}>
        <code>
          {tokens
            ? tokens.map((line, i) => (
                <span className="code-line" key={i}>
                  {line.map((t, j) => (
                    <span key={j} style={t.color ? { color: t.color } : undefined}>
                      {t.content}
                    </span>
                  ))}
                  {"\n"}
                </span>
              ))
            : lines.map((line, i) => (
                <span className="code-line" key={i}>
                  {line}
                  {"\n"}
                </span>
              ))}
        </code>
      </pre>
    </figure>
  )
}

/* ------------------------------------------------------------------ install commands */

const managers = [
  { id: "pnpm", label: "pnpm", run: "pnpm dlx shadcn@latest add" },
  { id: "npm", label: "npm", run: "npx shadcn@latest add" },
  { id: "yarn", label: "yarn", run: "yarn dlx shadcn@latest add" },
  { id: "bun", label: "bun", run: "bunx --bun shadcn@latest add" },
] as const
type Manager = (typeof managers)[number]["id"]

// The chosen package manager is the same in every install command on the site, and kept.
const KEY = "uiset-site-pm"
const pmListeners = new Set<() => void>()
const readManager = (): Manager => {
  try {
    const value = localStorage.getItem(KEY)
    return managers.some((m) => m.id === value) ? (value as Manager) : "pnpm"
  } catch {
    return "pnpm"
  }
}
function setManager(id: Manager) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* private mode: it lasts for the page */
  }
  current = id
  pmListeners.forEach((l) => l())
}
let current: Manager | null = null
const useManager = () =>
  useSyncExternalStore(
    (l) => (pmListeners.add(l), () => pmListeners.delete(l)),
    () => (current ??= readManager()),
    () => "pnpm" as Manager,
  )

/** The shadcn command that adds UISet items, for the package manager people use, with copy. */
function InstallCommand({ items, className, label = "Install" }: { items: string[]; className?: string; label?: string }) {
  const pm = useManager()
  const manager = managers.find((m) => m.id === pm)!
  const command = `${manager.run} ${items.map((item) => (item.includes("/") ? item : `@uiset/${item}`)).join(" ")}`
  return (
    <div className={["install-command", className].filter(Boolean).join(" ")} role="group" aria-label={label}>
      {/* Named for its command: a page can show several, and a step by name must find one. */}
      <SegmentedControl
        className="install-command-managers"
        aria-label={`Package manager to ${label.charAt(0).toLowerCase()}${label.slice(1)}`}
        value={pm} onValueChange={(value) => value && setManager(value as Manager)}>
        {managers.map((m) => (
          <SegmentedControlItem key={m.id} value={m.id}>
            {m.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <div className="install-command-line">
        <code translate="no">{command}</code>
        <CopyButton value={command} label="Copy" copiedLabel="Copied" aria-label={`Copy the command to ${label.charAt(0).toLowerCase()}${label.slice(1)}`} />
      </div>
    </div>
  )
}

/** One shell command with copy (for commands that aren't a shadcn install). */
function CommandLine({ command, className }: { command: string; className?: string }) {
  // Named for the command, so it differs from the install commands' "Copy the command to …".
  return (
    <div className={["install-command", "install-command-single", className].filter(Boolean).join(" ")}>
      <div className="install-command-line">
        <code translate="no">{command}</code>
        <CopyButton value={command} label="Copy" aria-label={`Copy ${command}`} />
      </div>
    </div>
  )
}

export { CodeBlock, CommandLine, InstallCommand }
