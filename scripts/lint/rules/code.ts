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
  why: "Project rule: cascade layers order UISet's CSS, so apps override it without !important. The one exception is the reduced-motion reset, under the system setting or a root's motion=\"reduce\".",
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
      if (text.startsWith("!important", i) && !blocks.some((b) => /@media[^{]*prefers-reduced-motion|\[data-motion="reduce"\]/.test(b)))
        out.push({ line: lineOf(text, i), message: "!important outside the reduced-motion reset: order it with UISet's layers instead." })
    }
    return out
  },
}

/** Every frame the site draws an example in: the docs preview, the library card and the kit stage. */
const EXAMPLE_FRAMES = [".example", ".lib-example", ".item-frame"]

export const exampleFrames: FileRule = {
  id: "site/example-frames",
  why: "2026-11-19: .stack was styled only in .example and .lib-example, so on kit pages (.item-frame) the lists demo lost every gap and its three demos ran together; the owner saw it.",
  appliesTo: (path) => path.startsWith("src/site/") && path.endsWith(".css"),
  check: (text) =>
    [...text.matchAll(/:is\(([^)]*\.example[^)]*)\)\s+\.(row|actions|stack)\b/g)]
      .filter((m) => EXAMPLE_FRAMES.some((frame) => !m[1]!.split(",").map((s) => s.trim()).includes(frame)))
      .map((m) => ({
        line: lineOf(text, m.index!),
        message: `.${m[2]} is styled in only some of the frames examples render in. List all of them: ${EXAMPLE_FRAMES.join(", ")}.`,
      })),
}

export const internalPrimitives: FileRule = {
  id: "web/internal-primitives",
  why: "2026-11-19: the sortable list and tree were defined without @internal, so the end-of-day web build couldn't write @uiset/web's declarations (TS2883: a primitive's type names UI SDK internals). Every definePrimitive in the registry is marked @internal.",
  appliesTo: (path) => path.startsWith("registry/") && path.endsWith(".ts"),
  check: (text) =>
    [...text.matchAll(/^(?:export )?const (\w+) = definePrimitive\(/gm)]
      .filter((m) => !/\/\*\* @internal[^\n]*\*\/\n$/.test(text.slice(0, m.index!)))
      .map((m) => ({
        line: lineOf(text, m.index!),
        message: `${m[1]} is a primitive without /** @internal … */ above it: its type names UI SDK internals, so @uiset/web's declarations can't be written.`,
      })),
}

export const skinScope: FileRule = {
  id: "css/skin-scope",
  why: "2026-11-20: a skin's rules reached into a nested root of another skin, so on a Blueprint page the Ink theme card had Blueprint's uppercase labels and the Base card lost its labels in Ink; the owner saw the theme cards wrong. Each skin is wrapped in @scope with a lower boundary at other skins' roots, and its root rule names :scope (a bare root selector inside @scope only matches a nested root).",
  appliesTo: (path) => /^registry\/uiset\/ui\/uiset\/skins\/[\w-]+\.css$/.test(path),
  check(text, path) {
    const skin = /skins\/([\w-]+)\.css$/.exec(path)![1]
    const root = `[data-uiset][data-skin="${skin}"]`
    const out: Finding[] = []
    if (!text.includes(`@scope (${root}) to ([data-uiset]:not([data-skin="${skin}"]))`))
      out.push({ line: 1, message: `Wrap the skin in @scope (${root}) to ([data-uiset]:not([data-skin="${skin}"])) so it stops at a nested skin.` })
    text.split("\n").forEach((line, i) => {
      if (/^\s+\[data-uiset\]\[data-skin=/.test(line))
        out.push({ line: i + 1, message: `Inside @scope, start the root rule with :where(:scope)${root}; a bare root selector only matches a nested root.` })
    })
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

export const axeWaits: FileRule = {
  id: "tests/axe-waits",
  why: "2026-11-20: under reduced motion a popup still fades in for 120ms, and axe checks made straight after opening one read its text mid-fade as too faint (the data grid's list in Chrome, the rich text menu in WebKit). tests/e2e/axe.ts waits for transitions first.",
  appliesTo: (path) => path.startsWith("tests/e2e/") && path.endsWith(".spec.ts"),
  check: (text) =>
    [...text.matchAll(/from\s+["']@axe-core\/playwright["']/g)].map((m) => ({
      line: lineOf(text, m.index!),
      message: 'Import AxeBuilder from tests/e2e/axe.ts ("./axe" or "../axe"): it waits for transitions before axe runs.',
    })),
}

export const toastsVisible: FileRule = {
  id: "agent/toasts-visible",
  why: "2026-11-21: UISet's Toaster had data-agent-hidden on its region since 0.1.0, as UI SDK's agent-ready skill advised, so no agent could read a toast or press its Undo (vercel-labs/ui#978; the daily watch found it). An empty region already stays out of the snapshot. The installed skill still gives the advice.",
  appliesTo: (path) => /^(registry|src|web)\//.test(path) && /\.(tsx?|html)$/.test(path),
  check: (text) =>
    [...text.matchAll(/<(?:ToastRegion|ui-toast-region)\b[^>]*\bdata-agent-hidden/g)].map((m) => ({
      line: lineOf(text, m.index!),
      message: "Leave data-agent-hidden off a toast region: it hides every toast from agents, and an empty region is already left out (vercel-labs/ui#978).",
    })),
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

const arrayCallback = /\.(?:find|findIndex|findLast|map|flatMap|filter|some|every|forEach|reduce|sort)\(/g

export const hooksAtTopLevel: FileRule = {
  id: "react/hooks-at-top-level",
  why: "2026-11-23: the site's install text called useManager() inside managers.find(), so a card's copy button called it 1 to 4 times by the package manager chosen; switching it crashed the home page on uiset.dev for four days (React error #310). No lint knew React's rule and no test switched it where cards were.",
  appliesTo: (path) => /^(registry|src|web\/src)\//.test(path) && /\.tsx?$/.test(path),
  check(text) {
    const findings: Finding[] = []
    for (const m of text.matchAll(arrayCallback)) {
      const start = m.index! + m[0].length
      const body = callBody(text, start)
      // A call whose end wasn't found (an apostrophe in JSX text reads as a quote) proves nothing.
      if (start + body.length >= text.length) continue
      const hook = /(?<!function\s+)\buse[A-Z]\w*\(/.exec(body)
      if (hook) {
        findings.push({
          line: lineOf(text, start + hook.index),
          message: `${hook[0].slice(0, -1)} is called inside a callback, so it runs once per item it reaches: React needs the same hooks in the same order every render. Call it once at the top of the component and use its value in the callback.`,
        })
      }
    }
    // A hook behind a condition: cond && useX(), cond ? useX() : …
    for (const m of text.matchAll(/(?:&&|\|\||\?\?|[^?]\?)\s*(use[A-Z]\w*)\(/g)) {
      if (/^\s*\/\//.test(text.slice(text.lastIndexOf("\n", m.index!) + 1, m.index!))) continue
      findings.push({ line: lineOf(text, m.index!), message: `${m[1]} is called behind a condition, so some renders skip it: React needs the same hooks in the same order every render. Call it unconditionally and use its value conditionally.` })
    }
    return findings
  },
}

