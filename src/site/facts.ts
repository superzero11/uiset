// The numbers the site states about UISet, in one place. tests/unit/site-facts.test.ts checks
// them against registry.json, so a new item can't leave the home page out of date.

const facts = {
  /** UI SDK's own components, each a UISet item. */
  sdkComponents: 55,
  /** UISet's app frame and data display parts (app shell, page header, badge, stat…). */
  appParts: 22,
  kits: ["Chat", "Rich text", "Data grid", "Charts", "Board", "Scheduler", "Canvas", "IDE", "Mobile", "Terminal", "Studio", "Agent Console"],
  templates: 10,
  skins: 5,
  registryItems: 115,
} as const

export { facts }
