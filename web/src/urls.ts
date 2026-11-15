// Links and images from untrusted text (a model's answer): which URLs may be followed or loaded.

/**
 * The URL, if it's safe to link to: http, https, mailto, or relative. Model output can carry
 * `javascript:` and friends, written plainly or with entities; those come back as null.
 */
function safeUrl(value: string, extra: readonly string[] = []): string | null {
  // Browsers ignore controls and whitespace inside a scheme, so they're ignored here too.
  const cleaned = value.replace(/[\u0000- \u007f-\u009f]/g, "")
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)?.[1]?.toLowerCase()
  if (!scheme) return value.trim()
  return ["http", "https", "mailto", ...extra].includes(scheme) ? value.trim() : null
}

/** Same-origin, data: and blob: images load; remote ones wait for the page to allow them. */
const sameOriginImages = (url: URL) => url.origin === location.origin || url.protocol === "data:" || url.protocol === "blob:"

export { safeUrl, sameOriginImages }
