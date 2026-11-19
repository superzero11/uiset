// The numbers the site states about UISet, in one place. tests/unit/site-facts.test.ts checks
// them against registry.json, so a new item can't leave the home page out of date.

const facts = {
  /** UI SDK's own components, each a UISet item. */
  sdkComponents: 55,
  /** UISet's own parts: the app frame, data display, forms and lists (app shell, badge, inline edit, sortable list…). */
  appParts: 23,
  kits: ["Chat", "Rich text", "Data grid", "Charts", "Board", "Scheduler", "Canvas", "IDE", "Mobile", "Terminal", "Studio", "Agent Console"],
  templates: 10,
  skins: 5,
  registryItems: 116,
  /** Kit pages in the docs and cards in the library: the kits above, the app frame, forms, and lists and trees. */
  kitPages: 15,
} as const

export { facts }
