import config from "@/uiset.config.json"
import { useEffect } from "react"

// Each page's title, description, canonical address, social cards and structured data. The
// build renders every page and saves the result, so search engines and AI answer engines
// read these without running JavaScript.

// The site's address, from uiset.config.json (also read by the registry, docs and prerender).
const SITE = config.homepage
const NAME = "UISet"
const DEFAULT_IMAGE = `${SITE}/og.png`

type PageMeta = {
  /** The page's own title; "UISet" is added unless it's already there. */
  title: string
  description: string
  path: string
  image?: string
  type?: "website" | "article"
  /** JSON-LD objects for this page. */
  structured?: object[]
}

function setTag(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = create()
    document.head.append(el)
  }
  el.setAttribute(attr, value)
}

const meta = (key: "name" | "property", name: string) => () => {
  const el = document.createElement("meta")
  el.setAttribute(key, name)
  return el
}

function applyMeta(page: PageMeta) {
  const title = page.title.includes(NAME) ? page.title : `${page.title} · ${NAME}`
  const url = `${SITE}${page.path === "/" ? "" : page.path}`
  const image = page.image ?? DEFAULT_IMAGE
  document.title = title
  setTag('meta[name="description"]', meta("name", "description"), "content", page.description)
  setTag('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", url)
  const og: Record<string, string> = {
    "og:title": title,
    "og:description": page.description,
    "og:url": url,
    "og:type": page.type ?? "website",
    "og:site_name": NAME,
    "og:image": image,
  }
  for (const [key, value] of Object.entries(og)) setTag(`meta[property="${key}"]`, meta("property", key), "content", value)
  const twitter: Record<string, string> = { "twitter:card": "summary_large_image", "twitter:title": title, "twitter:description": page.description, "twitter:image": image }
  for (const [key, value] of Object.entries(twitter)) setTag(`meta[name="${key}"]`, meta("name", key), "content", value)
  document.head.querySelectorAll("script[data-page-ld]").forEach((el) => el.remove())
  for (const data of page.structured ?? []) {
    const script = document.createElement("script")
    script.type = "application/ld+json"
    script.dataset.pageLd = ""
    script.textContent = JSON.stringify({ "@context": "https://schema.org", ...data })
    document.head.append(script)
  }
}

function usePageMeta(page: PageMeta) {
  const key = JSON.stringify(page)
  useEffect(() => applyMeta(page), [key]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** A docs or guide page as schema.org TechArticle, with its breadcrumb trail. */
function articleData(page: { title: string; description: string; path: string; trail: { name: string; path: string }[] }) {
  return [
    { "@type": "TechArticle", headline: page.title, description: page.description, url: `${SITE}${page.path}`, about: "UI SDK", isPartOf: { "@type": "WebSite", name: NAME, url: SITE } },
    {
      "@type": "BreadcrumbList",
      itemListElement: page.trail.map((step, i) => ({ "@type": "ListItem", position: i + 1, name: step.name, item: `${SITE}${step.path}` })),
    },
  ]
}

export { applyMeta, articleData, NAME, SITE, usePageMeta }
export type { PageMeta }
