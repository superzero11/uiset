// Every connection the checker's browser makes goes through this SOCKS5 proxy: pages, scripts,
// redirects and WebSockets alike. It resolves each host itself and connects only to the public
// address it checked, on the web's ports, so neither a page nor a DNS answer that changes
// between lookups can reach a private network.
import { once } from "node:events"
import { connect, createServer, type AddressInfo, type Socket } from "node:net"
import { allowPrivate, publicAddressOf } from "./guard"

type Proxy = {
  /** For Chromium's --proxy-server. */
  server: string
  /** The hosts it wouldn't connect to. */
  refused: Set<string>
  close(): void
}

// SOCKS5 (RFC 1928) replies.
const reply = { ok: 0, notAllowed: 2, unreachable: 4, refused: 5, badCommand: 7, badAddress: 8 }

/** Reads exact byte counts from a socket, then hands back what's left over. */
function reader(socket: Socket) {
  let buffered = Buffer.alloc(0)
  let waiting: { size: number; resolve: (bytes: Buffer) => void; reject: (error: Error) => void } | undefined
  const deliver = () => {
    if (!waiting || buffered.length < waiting.size) return
    const { size, resolve } = waiting
    waiting = undefined
    const bytes = buffered.subarray(0, size)
    buffered = buffered.subarray(size)
    resolve(bytes)
  }
  const onData = (chunk: Buffer) => {
    buffered = Buffer.concat([buffered, chunk])
    deliver()
  }
  const onEnd = () => waiting?.reject(new Error("The browser closed the connection."))
  socket.on("data", onData).on("end", onEnd).on("close", onEnd)
  return {
    read: (size: number) =>
      new Promise<Buffer>((resolve, reject) => {
        waiting = { size, resolve, reject }
        deliver()
      }),
    release() {
      socket.pause()
      socket.off("data", onData).off("end", onEnd).off("close", onEnd)
      return buffered
    },
  }
}

async function startProxy(): Promise<Proxy> {
  const sockets = new Set<Socket>()
  const refused = new Set<string>()
  const track = (socket: Socket) => {
    sockets.add(socket)
    socket.once("close", () => sockets.delete(socket)).on("error", () => socket.destroy())
  }

  async function serve(client: Socket) {
    const input = reader(client)
    const answer = (code: number) => client.end(Buffer.from([5, code, 0, 1, 0, 0, 0, 0, 0, 0]))
    const [version, methods] = await input.read(2)
    if (version !== 5) return client.destroy()
    // No authentication: it listens on this machine only, for one check's browser.
    if (!(await input.read(methods!)).includes(0)) return client.end(Buffer.from([5, 0xff]))
    client.write(Buffer.from([5, 0]))
    const [, command, , kind] = await input.read(4)
    let host: string
    if (kind === 1) host = [...(await input.read(4))].join(".")
    else if (kind === 3) host = (await input.read((await input.read(1))[0]!)).toString("latin1")
    else if (kind === 4) {
      const bytes = await input.read(16)
      host = Array.from({ length: 8 }, (_, i) => bytes.readUInt16BE(i * 2).toString(16)).join(":")
    } else return answer(reply.badAddress)
    const port = (await input.read(2)).readUInt16BE(0)
    if (command !== 1) return answer(reply.badCommand)
    const address = port === 80 || port === 443 || allowPrivate() ? await publicAddressOf(host) : null
    if (!address) {
      refused.add(host)
      return answer(reply.notAllowed)
    }
    const upstream = connect({ host: address, port })
    track(upstream)
    upstream.setTimeout(10_000, () => upstream.destroy(new Error("No answer in 10 seconds.")))
    try {
      await once(upstream, "connect")
    } catch (error) {
      return answer((error as NodeJS.ErrnoException).code === "ECONNREFUSED" ? reply.refused : reply.unreachable)
    }
    upstream.setTimeout(0)
    client.write(Buffer.from([5, reply.ok, 0, 1, 0, 0, 0, 0, 0, 0]))
    const early = input.release()
    if (early.length) upstream.write(early)
    client.pipe(upstream).on("error", () => client.destroy())
    upstream.pipe(client)
    upstream.once("close", () => client.destroy())
    client.once("close", () => upstream.destroy())
  }

  const server = createServer((client) => {
    track(client)
    serve(client).catch(() => client.destroy())
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const { port } = server.address() as AddressInfo
  return {
    server: `socks5://127.0.0.1:${port}`,
    refused,
    close() {
      server.close()
      for (const socket of sockets) socket.destroy()
    },
  }
}

export { startProxy }
export type { Proxy }
