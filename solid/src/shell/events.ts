/** Calls a Solid event handler as it was given: a function, or the bound form `[handler, data]`. */
function callHandler(handler: unknown, event: Event, ...rest: unknown[]): unknown {
  if (typeof handler === "function") return handler(event, ...rest)
  if (Array.isArray(handler) && typeof handler[0] === "function") return handler[0](handler[1], event, ...rest)
  return undefined
}

export { callHandler }
