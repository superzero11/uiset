import { lineOf, type FileRule, type Finding } from "../core.ts"

const source = (path: string) => /^(registry|src|web\/src)\//.test(path) && /\.(ts|tsx)$/.test(path)

/** The text inside a call's parentheses, from just after "(", skipping strings and comments. */
function callBody(text: string, start: number) {
  let depth = 1
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (c === "/" && text[i + 1] === "/") i = text.indexOf("\n", i) === -1 ? text.length : text.indexOf("\n", i)
    else if (c === "/" && text[i + 1] === "*") i = text.indexOf("*/", i + 2) + 1 || text.length
    else if (c === '"' || c === "'" || c === "`") {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === "\\") i++
    } else if (c === "(") depth++
    else if (c === ")" && --depth === 0) return text.slice(start, i)
  }
  return text.slice(start)
}

export const noDeferredFocus: FileRule = {
  id: "focus/no-deferred-focus",
  why: "2026-11-18: Undo and Add node put focus off a frame or two, so a quick key landed first and lost its focus (WebKit failed 5 runs in 6).",
  appliesTo: source,
  check(text) {
    const lines = new Set<number>()
    let flaggedUntil = -1
    for (const m of text.matchAll(/\brequestAnimationFrame\(/g)) {
      // A frame inside a flagged frame (a double requestAnimationFrame) is the same site.
      if (m.index! < flaggedUntil) continue
      const start = m.index! + m[0].length
      const body = callBody(text, start)
      if (!/\.focus\(|\bfocus[A-Z]\w*\(/.test(body)) continue
      lines.add(lineOf(text, m.index!))
      flaggedUntil = start + body.length
    }
    return [...lines].map((line) => ({
      line,
      message: "Focus put off to a later frame can land after the person has moved on. Focus in the same task: before a popup closes, in a microtask after a draw, or with UI SDK's keepFocus.",
    }))
  },
}

const ROLES = "listbox|menu|menubar|menuitem|menuitemcheckbox|menuitemradio|dialog|alertdialog|tablist|tab|tabpanel|switch|slider|radiogroup|toolbar|tree|treeitem|treegrid|combobox|grid|option|spinbutton|tooltip"

export const noHandRolledRoles: FileRule = {
  id: "ui-sdk/no-hand-rolled-roles",
  why: "Project rule: behavior comes from UI SDK. A role like listbox written by hand next to UI SDK is almost always a component UI SDK ships (the ui-sdk skill).",
  appliesTo: (path) => /^(registry|src|web)\//.test(path) && /\.(tsx|html)$/.test(path),
  check: (text) =>
    [...text.matchAll(new RegExp(`(?:^|[\\s{(])role=\\{?["'](${ROLES})["']`, "gm"))].map((m) => ({
      line: lineOf(text, m.index!),
      message: `role="${m[1]}" written by hand: use the UI SDK component or behavior that provides it.`,
    })),
}

export const relativeImports: FileRule = {
  id: "registry/relative-imports",
  why: "Project rule: files in registry/ are copied into apps by `shadcn add`, where the @/ alias doesn't point at UISet.",
  appliesTo: (path) => path.startsWith("registry/") && /\.(ts|tsx)$/.test(path),
  check: (text) =>
    [...text.matchAll(/(?:\bfrom\s+|\bimport\(\s*)["']@\//g)].map((m) => ({
      line: lineOf(text, m.index!),
      message: "Import other UISet files with a relative path, so they still resolve after `shadcn add` copies them.",
    })),
}

export const noImportant: FileRule = {
  id: "css/no-important",
  why: "Project rule: cascade layers order UISet's CSS, so apps override it without !important. The one exception is the reduced-motion reset.",
  appliesTo: (path) => /^(registry|src|web\/src)\//.test(path) && path.endsWith(".css"),
  check(text) {
    const out: Finding[] = []
    const blocks: string[] = []
    let prelude = ""
    for (let i = 0; i < text.length; i++) {
      const c = text[i]!
      if (c === "/" && text[i + 1] === "*") {
        i = text.indexOf("*/", i + 2) + 1 || text.length
        continue
      }
      if (c === "{") {
        blocks.push(prelude)
        prelude = ""
      } else if (c === "}") {
        blocks.pop()
        prelude = ""
      } else if (c === ";") prelude = ""
      else prelude += c
      if (text.startsWith("!important", i) && !blocks.some((b) => /@media[^{]*prefers-reduced-motion/.test(b)))
        out.push({ line: lineOf(text, i), message: "!important outside the reduced-motion reset: order it with UISet's layers instead." })
    }
    return out
  },
}

export const pinUiSdk: FileRule = {
  id: "deps/pin-ui-sdk",
  why: "Project rule: UI SDK is in beta, so UISet pins its exact version and moves only after the whole suite passes on a new one.",
  appliesTo: (path) => path === "package.json" || path === "web/package.json",
  check(text) {
    const out: Finding[] = []
    const json = JSON.parse(text) as Record<string, Record<string, string> | undefined>
    for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"])
      for (const [name, version] of Object.entries(json[section] ?? {}))
        if (name.startsWith("@ui-sdk/") && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/.test(version)) {
          const at = text.indexOf(`"${name}"`)
          out.push({ line: lineOf(text, at), message: `${name} is "${version}"; pin an exact version, like "0.1.0-beta.9".` })
        }
    return out
  },
}

export const noOnly: FileRule = {
  id: "tests/no-only",
  why: "A test left on .only skips every other test in its file, and the suite still passes.",
  appliesTo: (path) => path.startsWith("tests/") && /\.(ts|tsx)$/.test(path),
  check: (text) =>
    [...text.matchAll(/\b(?:test|it|describe)(?:\.describe)?\.only\s*\(/g)].map((m) => ({
      line: lineOf(text, m.index!),
      message: "Remove .only: it skips the other tests in this file.",
    })),
}
