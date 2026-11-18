// The site's stated numbers match the registry they describe.
import { readFileSync, readdirSync } from "node:fs"
import { expect, test } from "vitest"
import { facts } from "@/src/site/facts"

const registry = JSON.parse(readFileSync("registry.json", "utf8")) as { items: { name: string; type: string }[] }
const sdk = new Set(readdirSync("node_modules/@ui-sdk/react/docs/components").map((f) => f.replace(/\.md$/, "")))

test("the site's counts are the registry's", () => {
  expect(registry.items.length).toBe(facts.registryItems)
  expect(registry.items.filter((i) => sdk.has(i.name)).length).toBe(facts.sdkComponents)
  expect(registry.items.filter((i) => i.type === "registry:block").length).toBe(facts.templates)
  const appParts = ["app-shell", "breadcrumbs", "page-header", "card", "badge", "stat", "empty-state", "skeleton", "description-list", "item-list", "alert", "kbd", "spinner", "stepper", "search-field", "copy-button", "table", "avatar-group", "code-block", "inline-edit", "upload", "schema-form"]
  expect(appParts.every((n) => registry.items.some((i) => i.name === n))).toBe(true)
  expect(appParts.length).toBe(facts.appParts)
})

test("the library menu counts the kit pages the docs list", async () => {
  const { docPages } = await import("@/src/site/docs/nav")
  expect(docPages.filter((p) => p.section === "Kits").length).toBe(facts.kitPages)
})
