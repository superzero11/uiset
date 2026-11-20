// The numbers the site states about UISet, in one place. tests/unit/site-facts.test.ts checks
// them against registry.json, so a new item can't leave the home page out of date.

const facts = {
  /** UI SDK's own components, each a UISet item. */
  sdkComponents: 55,
  /** UISet's own parts: the app frame, data display, forms, lists and motion pieces (app shell, badge, inline edit, sortable list and tree, number ticker…). */
  appParts: 28,
  kits: ["Chat", "Rich text", "Data grid", "Charts", "Board", "Scheduler", "Canvas", "IDE", "Mobile", "Terminal", "Studio", "Agent Console"],
  templates: 10,
  skins: 5,
  registryItems: 122,
  /** Kit pages in the docs and cards in the library: the kits above, the app frame, forms, lists and trees, and motion. */
  kitPages: 16,
} as const

export { facts }
