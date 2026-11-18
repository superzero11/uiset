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
  why: "2026-11-18: after the move to beta.10, the home page's What's new still led with \"On UI SDK beta.9\". The site names the UI SDK version package.json pins. (docs/ may name an older one: the published @uiset/web's peers.)",
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
