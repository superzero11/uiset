import { readFileSync } from "node:fs"
import { createAgent } from "@ui-sdk/web/agent"
import { createBridge, settle } from "./bridge"

// A Web Components page from web/ in jsdom: its body's markup, then its page script, run fresh
// each time (the element modules load once: an element can't be defined twice). Drive it
// through the web agent bridge with the same helper as React's.

const pageScripts = import.meta.glob("../../web/src/**/*.ts")
let run = 0

/** Opens `web/<html>` with its script `web/src/<script>`; returns the page's bridge. */
export async function openWebPage(html: string, script: string) {
  await import("../../web/src/uiset")
  const source = readFileSync(`web/${html}`, "utf8")
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(source)?.[1] ?? ""
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, "")
  const path = `../../web/src/${script}`
  if (!pageScripts[path]) throw new Error(`No page script ${path}`)
  // A query makes a new module, so the page script runs again on this page.
  await import(/* @vite-ignore */ `${path}?page=${++run}`)
  await settle()
  return createBridge(createAgent)
}
