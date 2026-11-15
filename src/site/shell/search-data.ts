import { docPages } from "../docs/nav"

// What ⌘K searches: every docs page, and the site's own pages.

type SearchEntry = { path: string; title: string; section: string; keywords?: string[] }

const pages: SearchEntry[] = [
  { path: "/", title: "Home", section: "Site" },
  { path: "/components", title: "All components, live", section: "Site", keywords: ["gallery"] },
  { path: "/kits", title: "All kits, live", section: "Site" },
  { path: "/templates", title: "Templates, live", section: "Site", keywords: ["pages"] },
  { path: "/themes", title: "Skins", section: "Site", keywords: ["themes", "look"] },
  { path: "/themes/generator", title: "Theme generator", section: "Site", keywords: ["color", "palette", "tokens", "builder"] },
  { path: "/agents", title: "Agents and the benchmark", section: "Site", keywords: ["agent bridge", "mcp", "benchmark"] },
]

let cached: SearchEntry[] | null = null
function searchEntries(): SearchEntry[] {
  cached ??= [...docPages.map((p) => ({ path: p.path, title: p.title, section: p.section, keywords: [p.description, ...(p.keywords ?? [])] })), ...pages]
  return cached
}

export { searchEntries }
export type { SearchEntry }
