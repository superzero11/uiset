// GET /api/agent-check?url=example.com: loads a public page in a browser and returns its
// agent-readiness report as JSON. uiset.dev/check is its page. Vercel runs the bundle of this
// file, api/agent-check.js (scripts/api.mjs), since it can't compile this project's TypeScript.
import { CheckError, publicUrl } from "./guard"
import { checkUrl } from "./run"

// Each instance checks two pages at a time, each in its own browser, and lets one visitor load
// ten pages in ten minutes; an address it refuses doesn't count. The CDN keeps each address's
// result for ten minutes, so a page asked for often is loaded once.
const perVisitor = { checks: 10, windowMs: 10 * 60_000 }
const atOnce = 2
const recent = new Map<string, number[]>()
let running = 0

const json = (body: unknown, status: number, cache = "no-store") =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache } })

function visitorOf(request: Request) {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}

/** Whether this visitor may start another check now; counts it when they may. */
function allowed(visitor: string, now = Date.now()) {
  const times = (recent.get(visitor) ?? []).filter((time) => now - time < perVisitor.windowMs)
  if (times.length >= perVisitor.checks) return false
  recent.set(visitor, [...times, now])
  if (recent.size > 5_000) recent.delete(recent.keys().next().value!)
  return true
}

export async function GET(request: Request) {
  let address: URL
  try {
    address = await publicUrl(new URL(request.url).searchParams.get("url"))
  } catch (error) {
    if (error instanceof CheckError) return json({ error: error.message }, error.status)
    throw error
  }
  if (!allowed(visitorOf(request))) {
    return json({ error: "That's a lot of checks in a few minutes. Try again in a little while, or run the check yourself with the bookmarklet or the command line." }, 429)
  }
  if (running >= atOnce) return json({ error: "The checker is busy with other pages. Try again in a few seconds." }, 503)
  running++
  try {
    const checked = await checkUrl(address.href)
    return json(checked, 200, "public, s-maxage=600, stale-while-revalidate=60")
  } catch (error) {
    if (error instanceof CheckError) return json({ error: error.message }, error.status)
    console.error("agent-check failed", address.href, error)
    return json({ error: "The page couldn't be checked: the browser stopped before it finished. Try again, or use the bookmarklet on the page itself." }, 502)
  } finally {
    running--
  }
}
