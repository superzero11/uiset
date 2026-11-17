import { describe, expect, test } from "vitest"
import { tailwindLayerOrder } from "@/registry/uiset/ui/uiset/layers"

// UISet's layer goes between Tailwind's base (its reset) and components, wherever the page
// first read it, and every other layer keeps the place the page gave it.
describe("tailwindLayerOrder", () => {
  test("moves UISet from after Tailwind's utilities to just after its base", () => {
    expect(tailwindLayerOrder(["ui-sdk", "properties", "theme", "base", "components", "utilities", "uiset"])).toEqual([
      "ui-sdk",
      "properties",
      "theme",
      "base",
      "uiset",
      "components",
      "utilities",
    ])
  })

  test("moves UISet from before Tailwind's layers to just after its base", () => {
    expect(tailwindLayerOrder(["ui-sdk", "uiset", "theme", "base", "components", "utilities"])).toEqual([
      "ui-sdk",
      "theme",
      "base",
      "uiset",
      "components",
      "utilities",
    ])
  })

  test("keeps an app's own layers where the app put them", () => {
    expect(tailwindLayerOrder(["reset", "theme", "base", "app", "components", "utilities", "overrides", "uiset"])).toEqual([
      "ui-sdk",
      "reset",
      "theme",
      "base",
      "uiset",
      "app",
      "components",
      "utilities",
      "overrides",
    ])
  })

  test("adds UISet when the page hasn't read UISet's stylesheet yet, and counts each layer once", () => {
    expect(tailwindLayerOrder(["theme", "base", "components", "utilities", "base", "theme"])).toEqual([
      "ui-sdk",
      "theme",
      "base",
      "uiset",
      "components",
      "utilities",
    ])
  })

  test("keeps UI SDK's layer first, the lowest, even before UI SDK's stylesheet is on the page", () => {
    // UISet's stylesheet names ui-sdk after Tailwind's layers when it loads second.
    expect(tailwindLayerOrder(["theme", "base", "components", "utilities", "ui-sdk", "uiset"])).toEqual([
      "ui-sdk",
      "theme",
      "base",
      "uiset",
      "components",
      "utilities",
    ])
  })

  test("leaves a page without Tailwind's layers alone", () => {
    expect(tailwindLayerOrder(["ui-sdk", "uiset"])).toBeNull()
    expect(tailwindLayerOrder([])).toBeNull()
    // Panda CSS: a base and utilities, but no theme.
    expect(tailwindLayerOrder(["reset", "base", "tokens", "recipes", "utilities", "uiset"])).toBeNull()
    // utilities before base isn't Tailwind's order.
    expect(tailwindLayerOrder(["theme", "utilities", "base", "uiset"])).toBeNull()
  })
})
