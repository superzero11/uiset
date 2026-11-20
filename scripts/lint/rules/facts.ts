import { readFileSync } from "node:fs"
import { lineOf, type FileRule, type RepoRule } from "../core.ts"
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
