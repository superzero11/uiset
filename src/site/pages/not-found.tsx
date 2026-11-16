import { usePageMeta } from "../shell/meta"
import { useLocation } from "../shell/router"

function NotFoundPage() {
  const { pathname } = useLocation()
  usePageMeta({ title: "Page not found", description: "There's no page at this address on the UISet site.", path: pathname, noindex: true })
  return (
    <div className="page page-narrow">
      <h1>There&rsquo;s no page here</h1>
      <p>
        This address isn&rsquo;t a page on this site. Search with <kbd>⌘K</kbd>, or go to the <a href="/docs">docs</a>, the <a href="/components">components</a> or the{" "}
        <a href="/">home page</a>.
      </p>
    </div>
  )
}

export default NotFoundPage
