// Which addresses the link checker may load: public web pages only. A server that opens any
// address it's given could be pointed at private networks, so the address it's given, and every
// connection its browser makes after (proxy.ts), must go to public IPs.
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

/** Why a page couldn't be checked, said to the person who asked, with the response's status. */
class CheckError extends Error {
  readonly status: number
  constructor(message: string, status = 422) {
    super(message)
    this.status = status
  }
}

// Ranges that aren't the public internet: private, loopback, link-local, shared, reserved,
// documentation and multicast.
const privateV4 = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12",
  "192.0.0.0/24", "192.0.2.0/24", "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15",
  "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
].map((cidr) => {
  const [base, bits] = cidr.split("/") as [string, string]
  return { base: v4(base), mask: Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0 }
})

function v4(address: string) {
  return address.split(".").reduce((n, part) => ((n << 8) | Number(part)) >>> 0, 0)
}

/** An IPv6 address as its 16 bytes. The address must be valid (isIP). */
function v6Bytes(address: string): number[] {
  let ip = address.toLowerCase()
  // A trailing IPv4 part (::ffff:10.0.0.1) is the last two groups.
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(ip)
  if (dotted) {
    const n = v4(dotted[1]!)
    ip = `${ip.slice(0, -dotted[1]!.length)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`
  }
  const groups = (part: string) => (part ? part.split(":").map((group) => parseInt(group, 16)) : [])
  const [head = "", tail] = ip.split("::")
  const words = tail === undefined ? groups(head) : [...groups(head), ...Array<number>(8 - groups(head).length - groups(tail).length).fill(0), ...groups(tail)]
  return words.flatMap((word) => [word >> 8, word & 0xff])
}

/**
 * Whether an IP address is on the public internet. IPv6 is read as bytes, so every way of
 * writing an address (::ffff:7f00:1 is 127.0.0.1) is judged the same.
 */
function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) {
    const n = v4(address)
    return !privateV4.some(({ base, mask }) => (n & mask) === (base & mask))
  }
  if (family !== 6) return false
  const b = v6Bytes(address.replace(/%.*$/, ""))
  const zero = (from: number, to: number) => b.slice(from, to).every((byte) => byte === 0)
  const embedded = (at: number) => isPublicAddress(b.slice(at, at + 4).join("."))
  // IPv4 inside IPv6 is judged as IPv4: mapped (::ffff:0:0/96), NAT64 (64:ff9b::/96), 6to4 (2002::/16).
  if (zero(0, 10) && b[10] === 0xff && b[11] === 0xff) return embedded(12)
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && zero(4, 12)) return embedded(12)
  if (b[0] === 0x20 && b[1] === 0x02) return embedded(2)
  // Only global unicast (2000::/3) is public. That leaves out ::, ::1, unique local, link-local,
  // multicast and local-use NAT64; within it, the IETF's special block (Teredo, benchmarking:
  // 2001::/23) and documentation (2001:db8::/32, 3fff::/20).
  if ((b[0]! & 0xe0) !== 0x20) return false
  if (b[0] === 0x20 && b[1] === 0x01 && (b[2]! < 0x02 || (b[2] === 0x0d && b[3] === 0xb8))) return false
  if (b[0] === 0x3f && b[1] === 0xff && (b[2]! & 0xf0) === 0) return false
  return true
}

/** For tests: lets the checker load pages on this machine. Never set where it's deployed. */
const allowPrivate = () => process.env.AGENT_CHECK_ALLOW_PRIVATE === "1" && !process.env.VERCEL

const resolved = new Map<string, Promise<string | null>>()

/**
 * The address to connect to for a host: the IP itself, or what its name resolves to when every
 * address it has is public (IPv4 first); null when it has none or any is private. A name's answer
 * is kept for a minute, for the rest of the check's requests.
 */
function publicAddressOf(hostname: string): Promise<string | null> {
  const host = hostname.replace(/^\[|\]$/g, "")
  if (isIP(host)) return Promise.resolve(isPublicAddress(host) || allowPrivate() ? host : null)
  if (!allowPrivate() && /(^|\.)(localhost|local|internal|home\.arpa|intranet|lan)$/i.test(host)) return Promise.resolve(null)
  let known = resolved.get(host)
  if (!known) {
    known = lookup(host, { all: true, verbatim: true }).then(
      (addresses) => {
        if (addresses.length === 0 || (!allowPrivate() && !addresses.every(({ address }) => isPublicAddress(address)))) return null
        return (addresses.find(({ family }) => family === 4) ?? addresses[0]!).address
      },
      () => null,
    )
    resolved.set(host, known)
    setTimeout(() => resolved.delete(host), 60_000).unref?.()
  }
  return known
}

/** Whether a host is public: see publicAddressOf. */
const isPublicHost = async (hostname: string) => (await publicAddressOf(hostname)) !== null

/**
 * The address as a URL the checker may load, or a CheckError saying why not: a web address
 * (https:// is added when it has none), on the usual ports, with no password in it, for a
 * site that resolves only to public addresses.
 */
async function publicUrl(input: string | null | undefined): Promise<URL> {
  const text = (input ?? "").trim()
  if (!text) throw new CheckError("Enter a web address, like example.com.")
  let url: URL
  try {
    // "localhost:3000" and "example.com:443" are a host and a port, not a scheme.
    const scheme = /^[a-z][a-z\d+.-]*:\/\//i.test(text) || /^(javascript|data|file|mailto|about|blob|vbscript):/i.test(text)
    url = new URL(scheme ? text : `https://${text}`)
  } catch {
    throw new CheckError(`"${text.slice(0, 80)}" isn't a web address. Enter one like example.com.`)
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new CheckError("Only http and https addresses can be checked.")
  if (url.username || url.password) throw new CheckError("Leave the user name and password out of the address.")
  if (!(await isPublicHost(url.hostname))) {
    throw new CheckError(
      "That address is on a private network or couldn't be found, so this checker can't load it. For a page on your own machine, use the bookmarklet or the command line.",
    )
  }
  if (url.port && !["80", "443"].includes(url.port) && !allowPrivate()) throw new CheckError("Only addresses on the usual web ports (80 and 443) can be checked.")
  return url
}

/**
 * How the checker names itself to the sites it loads: as the Chrome it is, so they serve their
 * usual page, and by name, so they can tell it apart.
 */
const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 UISetAgentCheck/1.0 (+https://uiset.dev/check)"

export { allowPrivate, CheckError, isPublicAddress, isPublicHost, publicAddressOf, publicUrl, userAgent }
