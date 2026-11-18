import { ItemStage } from "../item-stage"
import { templates } from "../library"
import { templateDemos } from "../library-demos"
import { InstallCommand } from "../shell/code"
import { articleData, usePageMeta } from "../shell/meta"
import { useLocation } from "../shell/router"

// One template's page: the whole page live, in the sidebar's skin, and how to install it.

function TemplatePage() {
  const { pathname } = useLocation()
  const template = templates.find((t) => pathname === `/templates/${t.id}`)
  usePageMeta(
    template
      ? {
          title: `${template.name}: a UI SDK page template`,
          description: `${template.what}. A whole page built only from UISet items on Vercel's UI SDK; install it with the shadcn CLI and swap in your data.`,
          path: pathname,
          type: "article",
          structured: articleData({ title: template.name, description: template.what, path: pathname, trail: [{ name: "Templates", path: "/templates" }, { name: template.name, path: pathname }] }),
        }
      : { title: "Page not found", description: "There's no template here.", path: pathname, noindex: true },
  )
  if (!template)
    return (
      <article className="docs-main">
        <h1>That template isn&rsquo;t here</h1>
        <p>
          See every one under <a href="/templates">Templates</a>.
        </p>
      </article>
    )
  const Demo = templateDemos[template.id]!
  return (
    <article className="docs-main" data-wide="" aria-labelledby="docs-title">
      <header className="docs-head">
        <nav className="docs-crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="/templates">Templates</a>
            </li>
            <li aria-current="page">{template.name}</li>
          </ol>
        </nav>
        <h1 id="docs-title">{template.name}</h1>
        <p className="docs-lede">{template.what}.</p>
      </header>
      <ItemStage title={template.name} items={[template.id]} stageClass="template-frame">
        <Demo />
      </ItemStage>
      <div className="docs-article">
        <h2 id="installation">Installation</h2>
        <InstallCommand items={[template.id]} label={`Install the ${template.name} template`} />
        <p>
          It lands in <code>components/ui/templates/</code> with every UISet item it uses. Render it inside <a href="/docs/theming">&lt;UISet&gt;</a>, then swap the sample data for
          yours: <a href="/docs/templates">using templates</a> says what each one takes.
        </p>
      </div>
    </article>
  )
}

export default TemplatePage
