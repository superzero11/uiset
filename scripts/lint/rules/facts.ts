import { readFileSync } from "node:fs"
import { posix } from "node:path"
import { lineOf, type FileRule, type Problem, type RepoContext, type RepoRule } from "../core.ts"
import { facts } from "../../../src/site/facts.ts"

// Counts written into prose, checked against the numbers the site and its tests use.
const COUNTS: [RegExp, number][] = [
  [/\b(\d+) app parts\b/g, facts.appParts],
  [/\b(\d+) styled components\b/g, facts.sdkComponents],
  [/\b(\d+) kits\b/g, facts.kits.length],
  [/\b(\d+) templates\b/g, facts.templates],
  [/\b(\d+) skins\b/g, facts.skins],
]

export const statedCounts: FileRule = {
  id: "content/stated-counts",
  why: "2026-11-18: the docs introduction and README said 21 app parts after the 22nd was added; the site said 22. Counts in prose come from src/site/facts.ts.",
  appliesTo: (path) => path === "README.md" || (path.startsWith("docs/") && path.endsWith(".md") && path !== "docs/roadmap.md"),
  check: (text) =>
    COUNTS.flatMap(([pattern, want]) =>
      [...text.matchAll(pattern)]
        .filter((m) => Number(m[1]) !== want)
        .map((m) => ({ line: lineOf(text, m.index!), message: `"${m[0]}": it's ${want} (src/site/facts.ts).` })),
    ),
}

const BETA = /\bUI SDK (?:0\.1\.0-)?beta\.(\d+)\b/g

export const currentUiSdk: RepoRule = {
  id: "content/current-ui-sdk",
  why: "2026-11-18: after the move to beta.10, the home page's What's new still led with \"On UI SDK beta.9\". The site names the UI SDK version package.json pins. (docs/ and the READMEs are content/install-versions'.)",
  checkRepo(ctx) {
    const pinned = /"@ui-sdk\/react": "0\.1\.0-beta\.(\d+)"/.exec(ctx.read("package.json") ?? "")?.[1]
    if (!pinned) return []
    return ctx.paths
      .filter((path) => path.startsWith("src/site/") && /\.(ts|tsx)$/.test(path))
      .flatMap((path) => {
        const text = ctx.read(path) ?? ""
        return [...text.matchAll(BETA)]
          .filter((m) => m[1] !== pinned)
          .map((m) => ({ path, line: lineOf(text, m.index!), rule: "content/current-ui-sdk", message: `"${m[0]}": package.json pins beta.${pinned}.` }))
      })
  },
}

/** The newest dated release in the changelog that adds something: its version and date. */
function latestAddingRelease(changelog: string) {
  for (const head of changelog.matchAll(/^## (\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/gm)) {
    // The section runs to the next release heading, dated or not.
    const rest = changelog.slice(head.index! + head[0].length)
    const next = rest.search(/^## /m)
    if (/^### Added$/m.test(next < 0 ? rest : rest.slice(0, next))) return { version: head[1]!, date: head[2]! }
  }
  return undefined
}

export const whatsNewCurrent: RepoRule = {
  id: "content/whats-new",
  why: "2026-11-20: 0.6.0 (motion per skin and the Motion pieces) was ready to release while the home page's What's new still led with Nov 18–19 items, and missed 0.5.0's sortable lists; the owner caught it. A release that adds something has an entry in What's new dated on or after it.",
  checkRepo(ctx) {
    const release = latestAddingRelease(ctx.read("CHANGELOG.md") ?? "")
    const path = "src/site/pages/home.tsx"
    const home = ctx.read(path)
    if (!release || !home) return []
    const at = home.indexOf("const whatsNew")
    if (at < 0) return []
    const dates = [...home.slice(at).matchAll(/date: "(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]!)
    const newest = dates.sort().at(-1) ?? ""
    if (newest >= release.date) return []
    return [
      {
        path,
        line: lineOf(home, at),
        rule: "content/whats-new",
        message: `CHANGELOG's ${release.version} (${release.date}) adds things, but What's new's newest entry is ${newest || "missing"}. Add the release's headline to whatsNew.`,
      },
    ]
  },
}

const installed = (doc: string) => {
  const named = new Set<string>()
  for (const command of doc.matchAll(/npx shadcn@latest add((?:[^\n]*\\\n)*[^\n]*)/g))
    for (const item of command[1]!.matchAll(/@uiset\/([\w-]+)/g)) named.add(item[1]!)
  return named
}

export const kitInstall: RepoRule = {
  id: "content/kit-install",
  why: "2026-11-20: chat-message-parts joined the Chat kit (its items, its page's Agent parts) but the kit's install command in docs/chat.md still named five items, so copying it left the adapter out; the owner asked whether it was in the kit. A kit doc's install commands name every item of the kit, or an item one of them brings with it.",
  checkRepo(ctx) {
    const kits = ctx.read("scripts/docs.mjs") ?? ""
    const problems = []
    for (const kit of kits.matchAll(/title: "([^"]+)",\s*names: \[([^\]]*)\],\s*doc: "([^"]+)"/g)) {
      const path = `docs/${kit[3]}`
      const doc = ctx.read(path)
      if (!doc) continue
      const covered = installed(doc)
      // An item brings the items its source imports, like each chart's `./chart`.
      for (const name of covered) {
        const source = ctx.read(`registry/uiset/ui/${name}.tsx`) ?? ""
        for (const dep of source.matchAll(/from "\.\/([\w-]+)["/]/g)) covered.add(dep[1]!)
      }
      const missing = [...kit[2]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!).filter((name) => !covered.has(name))
      if (missing.length)
        problems.push({
          path,
          line: lineOf(doc, Math.max(0, doc.indexOf("npx shadcn@latest add"))),
          rule: "content/kit-install",
          message: `The ${kit[1]} kit's install command leaves out ${missing.map((m) => `@uiset/${m}`).join(", ")}. Add ${missing.length === 1 ? "it" : "them"} to the command.`,
        })
    }
    return problems
  },
}

// The registry item a source file belongs to: `chat-parts.tsx`, `chart/points.ts` (chart),
// `templates/ide-app.tsx` (ide-app).
const itemOf = (file: string) => {
  const rest = file.replace("registry/uiset/ui/", "").replace(/\.(tsx|ts)$/, "")
  return (rest.startsWith("templates/") ? rest.split("/")[1] : rest.split("/")[0])!
}

export const kitLive: RepoRule = {
  id: "content/kit-live",
  why: "2026-11-20: chat-message-parts (approvals, subagent runs, checkpoints, the queue) joined the Chat kit live only on its own component page; the kit page's Agent parts section had code alone, because adding it to the kit's demo was bigger and Claude left it out without asking. The owner: never again. Forms (inline edit, upload) and App frame (table) had the same gap. Every item of a kit is live on its kit's page: used by the kit's demo, or drawn under a section (`sections` in src/site/library.ts).",
  checkRepo(ctx) {
    const demos = ctx.read("src/site/library-demos.tsx")
    const library = ctx.read("src/site/library.ts")
    if (!demos || !library) return []
    const resolve = (spec: string, from: string) => {
      if (!spec.startsWith("@/") && !spec.startsWith(".")) return undefined
      const base = spec.startsWith("@/") ? spec.slice(2) : posix.join(posix.dirname(from), spec)
      return ["", ".tsx", ".ts", "/index.tsx", "/index.ts"].map((ext) => base + ext).find((path) => /\.tsx?$/.test(path) && ctx.read(path) !== undefined)
    }
    const used = (start: string) => {
      const seen = new Set<string>()
      const visit = (file: string | undefined) => {
        if (!file || seen.has(file)) return
        seen.add(file)
        for (const m of (ctx.read(file) ?? "").matchAll(/(?:from|import\()\s*"([^"]+)"/g)) visit(resolve(m[1]!, file))
      }
      visit(start)
      return new Set([...seen].filter((f) => f.startsWith("registry/uiset/ui/")).map(itemOf))
    }
    const block = demos.slice(demos.indexOf("const kitDemos"), demos.indexOf("const templateDemos"))
    const problems = []
    for (const demo of block.matchAll(/"?([\w-]+)"?: from\(\(\) => import\("([^"]+)"\)/g)) {
      const id = demo[1]!
      // Its entry in kitText runs to the next kit's.
      const at = library.search(new RegExp(`\\n  "?${id}"?: \\{`))
      if (at < 0) continue
      const next = library.slice(at + 1).search(/\n  "?[\w-]+"?: \{|\n\}/)
      const entry = library.slice(at, next < 0 ? undefined : at + 1 + next)
      const items = [...(/items: \[([^\]]*)\]/.exec(entry)?.[1]?.matchAll(/"([^"]+)"/g) ?? [])].map((m) => m[1]!)
      const sections = /sections: \{([^}]*)\}/.exec(entry)?.[1] ?? ""
      const live = used(resolve(demo[2]!, "src/site/library-demos.tsx") ?? "")
      for (const m of sections.matchAll(/:\s*"([^"]+)"/g)) live.add(m[1]!)
      const missing = items.filter((item) => !live.has(item))
      if (missing.length)
        problems.push({
          path: "src/site/library.ts",
          line: lineOf(library, at + 1),
          rule: "content/kit-live",
          message: `The ${id} kit's page shows ${missing.join(", ")} nowhere live: use ${missing.length === 1 ? "it" : "them"} in the kit's demo, or name ${missing.length === 1 ? "its" : "their"} example under a section (sections: { "heading-id": "item" }).`,
        })
    }
    return problems
  },
}

// The lint and its tests run from the repo root.
const pin = /"@ui-sdk\/react": "0\.1\.0-beta\.(\d+)"/.exec(readFileSync("package.json", "utf8"))?.[1]

// Install commands and the version the docs say UISet is on. History doesn't match these: a
// note of what was tested on a day ("`@ui-sdk/vue` 0.1.0-beta.5, on Node 24.21"), "since UI SDK
// 0.1.0-beta.8".
const STATED = [
  /@ui-sdk\/[\w-]+@0\.1\.0-beta\.(\d+)/g,
  /UI%20SDK%200\.1\.0--beta\.(\d+)/g,
  /(?<!since )UI SDK 0\.1\.0-beta\.(\d+)/g,
  /(?:public beta \(|now\s+|to\s+)`0\.1\.0-beta\.(\d+)`/g,
]

export const installVersions: FileRule = {
  id: "content/install-versions",
  why: "2026-11-19: once @uiset/web 0.4.0 (UI SDK beta.10 peers) was on npm, the install commands, the README badge, the package's own README and the docs introduction still said beta.5; the introduction had said so since the move to beta.9. Install lines and stated versions follow package.json's pin, so publish @uiset/web when the pin moves.",
  appliesTo: (path) => path === "README.md" || path === "web/README.md" || (path.startsWith("docs/") && path.endsWith(".md") && path !== "docs/roadmap.md"),
  check: (text) =>
    pin
      ? STATED.flatMap((pattern) =>
          [...text.matchAll(pattern)]
            .filter((m) => m[1] !== pin)
            .map((m) => ({ line: lineOf(text, m.index!), message: `"${m[0]}": UISet pins 0.1.0-beta.${pin} (package.json).` })),
        )
      : [],
}

// A skin with one scheme sets `color-scheme` in its own stylesheet; one without follows `theme`.
const oneScheme = (ctx: RepoContext) => {
  const skins = /type Skin = ([^\n]+)/.exec(ctx.read("registry/uiset/ui/uiset.tsx") ?? "")?.[1] ?? ""
  return [...skins.matchAll(/"(\w+)"/g)].flatMap(([, skin]) => {
    const m = /color-scheme:\s*(light|dark)\b/.exec(ctx.read(`registry/uiset/ui/uiset/skins/${skin}.css`) ?? "")
    return m ? [{ skin: skin!, scheme: m[1]! }] : []
  })
}

// "five skins, each in light and dark", "every skin in light and dark", "five skins (base, …, light and dark)".
const EVERY_SKIN_BOTH = [
  /\b(?:each|every|all)\b[^.\n]{0,20}?\bskins?\b[^.\n]{0,40}?\blight and dark\b/gi,
  /\bskins?\b[^.\n]{0,60}?\beach\b[^.\n]{0,10}?\blight and dark\b/gi,
  /\bskins? \([^)]*, light and dark\)/gi,
]
// A page that documents `theme` as a prop or attribute: a table row, a bullet, a list.
const DOCUMENTS_THEME = /`theme`\s*(?:\||:|\()/
const PROSE = (path: string) =>
  path === "README.md" ||
  path === "web/README.md" ||
  (path.startsWith("docs/") && path.endsWith(".md") && path !== "docs/roadmap.md") ||
  (path.startsWith("skills/") && path.endsWith(".md")) ||
  (path.startsWith("src/site/") && /\.tsx?$/.test(path) && !path.startsWith("src/site/generated/"))

export const skinSchemes: RepoRule = {
  id: "content/skin-schemes",
  why: "2026-11-24: superzero11/uiset#1, the first issue from someone using UISet: `theme` only changes Base, but the component pages said every skin came \"in light and dark\", @uiset/web's README said the same, the web-components docs presented `theme` as general, and the skill and the Vue and Svelte docs named only some of the skins with one scheme. Read from each skin's `color-scheme`: no blanket light-and-dark claim while a skin has one scheme, the theming table's Scheme column matches, and a page that documents `theme` names each one-scheme skin with its scheme.",
  checkRepo(ctx) {
    const fixed = oneScheme(ctx)
    if (!fixed.length) return []
    const problems: Problem[] = []
    for (const path of ctx.paths.filter(PROSE)) {
      const text = ctx.read(path) ?? ""
      for (const pattern of EVERY_SKIN_BOTH)
        for (const m of text.matchAll(pattern))
          problems.push({
            path,
            line: lineOf(text, m.index!),
            rule: "content/skin-schemes",
            message: `"${m[0]}": ${fixed.map((f) => f.skin).join(", ")} have one scheme each. Say which skins have light and dark.`,
          })
      if (!path.endsWith(".md")) continue
      text.split("\n").forEach((line, i) => {
        const row = /^\|\s*`(\w+)`\s*\|.*\|\s*(both|dark|light)\s*\|/.exec(line)
        if (!row) return
        const want = fixed.find((f) => f.skin === row[1])?.scheme ?? "both"
        if (row[2] !== want) problems.push({ path, line: i + 1, rule: "content/skin-schemes", message: `${row[1]}'s scheme is ${want} (its stylesheet's color-scheme), not ${row[2]}.` })
      })
      if (!DOCUMENTS_THEME.test(text)) continue
      // In one clause: no period, semicolon, parenthesis or table cell between the name and the scheme.
      const unnamed = fixed.filter(({ skin, scheme }) => !new RegExp(`\\b${skin}\\b[^.;()|]*?\\b${scheme}\\b`, "i").test(text))
      if (unnamed.length)
        problems.push({
          path,
          line: lineOf(text, text.search(DOCUMENTS_THEME)),
          rule: "content/skin-schemes",
          message: `This page documents \`theme\` but doesn't say ${unnamed.map((f) => `${f.skin} is ${f.scheme}`).join(", ")}. Name each one-scheme skin with its scheme, like "Blueprint, Studio and Phosphor are dark, and Ink is light".`,
        })
    }
    return problems
  },
}
