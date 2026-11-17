import { once } from "node:events"
import { connect, createServer, type AddressInfo, type Socket } from "node:net"
import { afterEach, expect, test } from "vitest"
import { startProxy, type Proxy } from "@/api/_agent-check/proxy"

// The link checker's proxy: its browser connects to the world only through it, and it connects
// only to public addresses on the web's ports.

let proxy: Proxy | undefined
afterEach(() => {
  proxy?.close()
  proxy = undefined
  delete process.env.AGENT_CHECK_ALLOW_PRIVATE
})

/** Reads exactly `size` bytes from a socket. */
async function take(socket: Socket, size: number) {
  let bytes = Buffer.alloc(0)
  while (bytes.length < size) {
    const chunk = socket.read() as Buffer | null
    if (chunk) bytes = Buffer.concat([bytes, chunk])
    else await once(socket, "readable")
  }
  if (bytes.length > size) socket.unshift(bytes.subarray(size))
  return bytes.subarray(0, size)
}

type Target = { ip: number[] } | { name: string } | { ipv6: number[] }

/** Asks the proxy, as a SOCKS5 client, to connect to a target; returns its reply code and the socket. */
async function ask(server: string, target: Target, port: number, early?: string) {
  const socket = connect(Number(new URL(server).port), "127.0.0.1")
  await once(socket, "connect")
  socket.write(Buffer.from([5, 1, 0]))
  expect([...(await take(socket, 2))]).toEqual([5, 0])
  const address =
    "ip" in target ? [1, ...target.ip] : "name" in target ? [3, target.name.length, ...Buffer.from(target.name)] : [4, ...target.ipv6]
  socket.write(Buffer.concat([Buffer.from([5, 1, 0, ...address, port >> 8, port & 0xff]), Buffer.from(early ?? "")]))
  const [, code] = await take(socket, 10)
  return { code, socket }
}

const notAllowed = 2

test("refuses private addresses by number, by name and in any IPv6 spelling, and ports other than 80 and 443", async () => {
  proxy = await startProxy()
  const mapped = [...Array(10).fill(0), 0xff, 0xff, 127, 0, 0, 1] // ::ffff:127.0.0.1
  for (const [target, port] of [
    [{ ip: [127, 0, 0, 1] }, 80],
    [{ ip: [169, 254, 169, 254] }, 80],
    [{ ip: [10, 1, 2, 3] }, 443],
    [{ name: "localhost" }, 443],
    [{ name: "printer.local" }, 80],
    [{ ipv6: mapped }, 443],
    [{ ipv6: [...Array(15).fill(0), 1] }, 80], // ::1
    [{ ip: [8, 8, 8, 8] }, 22],
  ] as [Target, number][]) {
    const { code, socket } = await ask(proxy.server, target, port)
    expect(code, JSON.stringify(target)).toBe(notAllowed)
    socket.destroy()
  }
  expect([...proxy.refused]).toEqual(expect.arrayContaining(["127.0.0.1", "169.254.169.254", "localhost", "printer.local", "0:0:0:0:0:ffff:7f00:1", "8.8.8.8"]))
})

test("connects where it's allowed and carries bytes both ways, including any sent before its answer", async () => {
  process.env.AGENT_CHECK_ALLOW_PRIVATE = "1"
  const echo = createServer((socket) => socket.pipe(socket))
  echo.listen(0, "127.0.0.1")
  await once(echo, "listening")
  try {
    proxy = await startProxy()
    const { code, socket } = await ask(proxy.server, { name: "localhost" }, (echo.address() as AddressInfo).port, "early ")
    expect(code).toBe(0)
    socket.write("hello")
    expect((await take(socket, 11)).toString()).toBe("early hello")
    // Closing the proxy ends what it carries.
    proxy.close()
    await once(socket, "close")
  } finally {
    echo.close()
  }
})
