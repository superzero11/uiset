import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import registry from "@/registry.json"
import { CopyButton } from "@/registry/uiset/ui/copy-button"
import { docPages, pathOfFile, type DocPage } from "../docs/nav"
import { ExamplePreview, useExample } from "../docs/component-preview"
import { CodeBlock, InstallCommand } from "../shell/code"
import { useSiteTheme } from "../shell/layout"
import { articleData, usePageMeta } from "../shell/meta"
import { useLocation } from "../shell/router"
import { ItemStage } from "../item-stage"
import { kits } from "../library"
import { kitDemos } from "../library-demos"
import { useSkin } from "../shell/skin-picker"

// Every Markdown page in docs/, loaded when its page opens.
const markdown = import.meta.glob("/docs/*.md", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>
const REPO = "https://github.com/superzero11/uiset"

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")

// A link to a section of this page is named for it, apart from the page of the same name:
// "Agents section" here, the Agents page in the header.
const sectionName = (heading: string) => `${heading.trim()} section`

const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<{ children?: ReactNode }>(child) ? textOf(child.props.children) : ""))
    .join("")

/**
 * Links between docs files become site paths, and so do links to uiset.dev itself, so they
 * stay on the site showing them. Site paths stay; links into the repo go to GitHub.
 */
function docHref(href: string | undefined): string | undefined {
  if (!href) return href
  if (/^https:\/\/uiset\.dev\//.test(href)) return href.slice("https://uiset.dev".length)
  if (/^(https?:|mailto:|#|\/)/.test(href)) return href
  const [file, hash] = href.split("#")
  const name = file!.split("/").at(-1)!
  if (name.endsWith(".md") && pathOfFile.has(name)) return `${pathOfFile.get(name)}${hash ? `#${hash}` : ""}`
  return `${REPO}/blob/main/${file!.replace(/^(\.\.\/|\.\/)+/, "")}${hash ? `#${hash}` : ""}`
}

const shadcnAdd = /^\s*npx shadcn@latest add\s+([\s\S]+?)\s*$/
const listOf = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`)

/** A table that scrolls sideways on a phone, named after the heading it sits under. */
function TableRegion({ children }: { children: ReactNode }) {
  const region = useRef<HTMLDivElement>(null)
  const [name, setName] = useState("Table")
  useEffect(() => {
    for (let el = region.current?.previousElementSibling; el; el = el.previousElementSibling) {
      if (/^H[23]$/.test(el.tagName)) {
        setName(`${el.textContent?.trim()} table`)
        return
      }
    }
  }, [])
  return (
    <div ref={region} className="docs-table" tabIndex={0} role="region" aria-label={name}>
      <table>{children}</table>
    </div>
  )
}

const mdComponents: Components = {
  h1: () => null, // the page header shows the title
  h2: ({ children }) => {
    const id = slugify(textOf(children))
    return (
      <h2 id={id}>
        <a className="heading-anchor" href={`#${id}`} aria-label={sectionName(textOf(children))}>
          {children}
        </a>
      </h2>
    )
  },
  h3: ({ children }) => {
    const id = slugify(textOf(children))
    return (
      <h3 id={id}>
        <a className="heading-anchor" href={`#${id}`} aria-label={sectionName(textOf(children))}>
          {children}
        </a>
      </h3>
    )
  },
  a: ({ href, children }) => <a href={docHref(href)}>{children}</a>,
  table: ({ children }) => <TableRegion>{children}</TableRegion>,
  pre: ({ children }) => {
    const code = Children.toArray(children)[0]
    if (!isValidElement<{ className?: string; children?: ReactNode }>(code)) return <pre>{children}</pre>
    const language = /language-(\w+)/.exec(code.props.className ?? "")?.[1]
    const text = textOf(code.props.children)
    // A shadcn install becomes the site's install command: every package manager, and copy.
    const add = language === "bash" ? shadcnAdd.exec(text.replace(/\\\n/g, " ")) : null
    if (add) {
      const items = add[1]!.split(/\s+/).filter(Boolean)
      // Named for what it installs: a page can show several, and agents find each by name.
      return <InstallCommand items={items} label={`Install ${listOf(items.map((item) => item.replace(/^@uiset\//, "")))}`} />
    }
    return <CodeBlock code={text} language={language} />
  },
}

/* ------------------------------------------------------------------ layout parts */

// A page's section in the breadcrumb opens that section's place in the library.
const crumbOf: Record<string, string> = { Components: "/components", Kits: "/kits", Templates: "/templates", Skins: "/themes" }

function PrevNext({ page }: { page: DocPage }) {
  const i = docPages.indexOf(page)
  const prev = docPages[i - 1]
  const next = docPages[i + 1]
  return (
    <nav className="docs-prevnext" aria-label="More docs">
      {prev && (
        <a href={prev.path} rel="prev">
          <span>Previous</span>
          {prev.title}
        </a>
      )}
      {next && (
        <a href={next.path} rel="next">
          <span>Next</span>
          {next.title}
        </a>
      )}
    </nav>
  )
}

/* ------------------------------------------------------------------ pages */

// Markdown already fetched, so a page that was preloaded (routes.tsx) draws at once.
const texts = new Map<() => Promise<string>, string>()
const FAILED = "_This page didn\u2019t load. Check your connection, then reload the page._"
const fetchText = (load: () => Promise<string>) =>
  load().then(
    (text) => (texts.set(load, text), text),
    () => FAILED,
  )

/** A Markdown file's text: at once when it's already fetched, otherwise when it arrives. */
function useMarkdown(load: (() => Promise<string>) | undefined) {
  const [source, setSource] = useState<string | null>(() => (load && texts.get(load)) ?? null)
  useEffect(() => {
    if (!load) return
    const cached = texts.get(load)
    if (cached !== undefined) {
      setSource(cached)
      return
    }
    let live = true
    setSource(null)
    fetchText(load).then((text) => live && setSource(text))
    return () => {
      live = false
    }
  }, [load])
  // Scroll to a heading named in the address once its page has drawn.
  useEffect(() => {
    if (source && window.location.hash) document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView()
  }, [source])
  return source
}

function MarkdownPage({ page }: { page: DocPage }) {
  const source = useMarkdown(markdown[`/docs/${page.file}`])
  const kit = page.section === "Kits" ? kits.find((k) => k.href === page.path) : undefined
  const Demo = kit ? kitDemos[kit.id] : undefined
  return (
    <>
      {kit && Demo && (
        <ItemStage title={kit.title} items={kit.items} stageClass={kit.stage ?? "grid-stage"} sound={kit.id === "studio"}>
          <Demo />
        </ItemStage>
      )}
      <div className="docs-article">
        {source === null ? <p className="docs-loading">Loading…</p> : <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents} skipHtml>{source}</ReactMarkdown>}
        <PageFooter page={page} markdownUrl={`/docs/${page.file}`} source={source} />
      </div>
    </>
  )
}

type Item = { name: string; title?: string; description?: string; registryDependencies?: string[]; files: { path: string }[] }

// Each component's API reference and accessibility, from UI SDK's docs (scripts/docs.mjs).
const sdkDocs = import.meta.glob("../docs/sdk/*.md", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>

function ComponentPage({ page }: { page: DocPage }) {
  const item = (registry as { items: Item[] }).items.find((i) => i.name === page.item)!
  const { theme } = useSiteTheme()
  const [skin] = useSkin()
  const example = useExample(item.name)
  const extras = item.registryDependencies?.map((d) => d.split("/").at(-1)!).filter((d) => d !== "uiset") ?? []
  return (
    <>
      <div className="docs-article">
        {example && (
          <>
            <h2 id="example">Example</h2>
            <ExamplePreview example={example} item={item.name} title={page.title} skin={skin} theme={theme} />
          </>
        )}
        <h2 id="installation">Installation</h2>
        <InstallCommand items={[item.name]} label={`Install ${page.title}`} />
        <p>
          It lands in <code>components/ui/{item.name}.tsx</code>, with UISet&rsquo;s root (<code>uiset</code>)
          {extras.length ? <> and {extras.map((d, i) => <span key={d}>{i > 0 && ", "}<code>{d}</code></span>)}</> : null}. Wrap your app in{" "}
          <a href="/docs/theming">&lt;UISet&gt;</a> once, and every component takes its skin.
        </p>
        {page.part ? (
          <>
            <h2 id="what-it-is">What it is</h2>
            <p>
              {page.title} is one of UISet&rsquo;s own parts, not a UI SDK component: it&rsquo;s built from UI SDK&rsquo;s behaviors and components, so it takes the
              keyboard, focus, screen readers and agents from them, and every skin styles it.
            </p>
            <ul>
              <li>Styles in five skins, each in light and dark, from CSS variables you can override.</li>
              <li>Text at 4.5:1 contrast and control edges and focus rings at 3:1, in every skin and theme, checked with axe in tests.</li>
              <li>Named for agents, so an agent can find it (see Agents below).</li>
            </ul>
            <p>
              Its props, its parts and how to wire it to your data are in <a href={page.part.guide}>its section of the {page.part.guide.includes("/forms") ? "Forms" : "App frame and data display"} guide</a>.
            </p>
          </>
        ) : (
          <SdkReference item={item.name} title={page.title} />
        )}
        <h2 id="agents">Agents</h2>
        <p>
          UI SDK&rsquo;s agent bridge finds this component by its accessible name: give it a visible label or an <code>aria-label</code>, and an agent can read its state and call
          its actions without screenshots. <a href="/docs/ai">Building with AI agents</a> shows how to connect one.
        </p>
        {example && (
          <p>
            Turn on <strong>Agent view</strong> above the example to see what an agent reads from it, as you use it, with its agent-check score and every action
            it offers, which you can run from there.
          </p>
        )}
        <PageFooter page={page} />
      </div>
    </>
  )
}

/** What UISet adds to a UI SDK component, and UI SDK's own API reference for it. */
function SdkReference({ item, title }: { item: string; title: string }) {
  const sdk = useMarkdown(sdkDocs[`../docs/sdk/${item}.md`])
  return (
    <>
      <h2 id="what-uiset-adds">What UISet adds</h2>
      <p>
        The component is UI SDK&rsquo;s own, with its parts, props and names, so everything below works as UI SDK documents it. UISet adds the look and checks it:
      </p>
      <ul>
        <li>Styles in five skins, each in light and dark, from CSS variables you can override.</li>
        <li>Text at 4.5:1 contrast and control edges and focus rings at 3:1, in every skin and theme, checked with axe in tests.</li>
        <li>Haptic cues on phones, and sound cues when you set <code>sound</code> on <code>&lt;UISet&gt;</code>.</li>
        <li>Examples that name every control, so agents can find it (see Agents below).</li>
      </ul>
      {sdk === null ? (
        <p className="docs-loading">Loading the API reference…</p>
      ) : (
        <>
          <div className="docs-sdk-credit">
            <p>
              The API reference and accessibility notes below are UI SDK&rsquo;s, from its docs for <code>@ui-sdk/react</code> (Apache-2.0).{" "}
              <a href={`https://ui-sdk.dev/docs/react/components/${item}`}>{title} on ui-sdk.dev</a> has more usage examples. Your coding agent can read the same page at{" "}
              <code>node_modules/@ui-sdk/react/docs/components/{item}.md</code>.
            </p>
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents} skipHtml>
            {sdk}
          </ReactMarkdown>
        </>
      )}
    </>
  )
}

function PageFooter({ page, markdownUrl, source }: { page: DocPage; markdownUrl?: string; source?: string | null }) {
  return (
    <footer className="docs-page-foot">
      <div className="docs-page-tools">
        {source && <CopyButton value={source} label="Copy page as Markdown" />}
        {markdownUrl && <a href={markdownUrl}>View Markdown</a>}
        {page.file && <a href={`${REPO}/edit/main/docs/${page.file}`}>Edit on GitHub</a>}
      </div>
      <PrevNext page={page} />
    </footer>
  )
}

function DocsPage() {
  const { pathname } = useLocation()
  const page = docPages.find((p) => p.path === pathname)
  usePageMeta(
    page
      ? {
          title: page.section === "Components" ? `${page.title}: UI SDK component, styled` : page.title,
          description: page.description,
          path: page.path,
          type: "article",
          structured: articleData({ title: page.title, description: page.description, path: page.path, trail: [{ name: "Docs", path: "/docs" }, ...(page.path === "/docs" ? [] : [{ name: page.title, path: page.path }])] }),
        }
      : { title: "Page not found", description: "This docs page doesn't exist.", path: pathname, noindex: true },
  )
  return page ? (
    <article className="docs-main" data-wide={page.section === "Kits" ? "" : undefined} aria-labelledby="docs-title">
      <header className="docs-head">
        <nav className="docs-crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <a href={crumbOf[page.section] ?? "/docs"}>{page.section === "Get started" ? "Docs" : page.section}</a>
            </li>
            {page.path !== "/docs" && <li aria-current="page">{page.title}</li>}
          </ol>
        </nav>
        <h1 id="docs-title">{page.title}</h1>
        <p className="docs-lede">{(page.section === "Kits" && kits.find((k) => k.href === page.path)?.description) || page.description}</p>
      </header>
      {page.file ? <MarkdownPage key={page.path} page={page} /> : <ComponentPage key={page.path} page={page} />}
    </article>
  ) : (
    <article className="docs-main">
      <h1>That page isn&rsquo;t here</h1>
      <p>
        Try the search in the sidebar, or start at the <a href="/docs">introduction</a>.
      </p>
    </article>
  )
}

/** Fetches a docs page's Markdown before it opens (see routes.tsx). */
async function preload(pathname: string) {
  const page = docPages.find((p) => p.path === (pathname.replace(/\/+$/, "") || "/"))
  if (!page) return
  const loads = [page.file ? markdown[`/docs/${page.file}`] : undefined, page.item ? sdkDocs[`../docs/sdk/${page.item}.md`] : undefined]
  await Promise.all(loads.filter((load): load is () => Promise<string> => !!load).map(fetchText))
}

export { preload }
export default DocsPage
