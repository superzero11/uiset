// The same command for npm, pnpm, yarn and bun, and the one choice of package manager that
// every command on a page shows and the next visit remembers. No React in it, so the web
// elements share it.
import { createLocalStorage, createPreference } from "@ui-sdk/core"

type CodeTab = { value: string; label: string; code: string; language?: string }

const managers = ["npm", "pnpm", "yarn", "bun"] as const
type PackageManager = (typeof managers)[number]

const packageManager = createPreference({
  values: managers,
  defaultValue: "npm",
  attribute: "data-package-manager",
  storage: createLocalStorage("uiset-package-manager"),
})

const installs: Record<PackageManager, string> = {
  npm: "npm install",
  pnpm: "pnpm add",
  yarn: "yarn add",
  bun: "bun add",
}
const runs: Record<PackageManager, string> = {
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
  bun: "bunx",
}

type PackageCommandOptions =
  | { install: string; dev?: boolean; run?: never }
  | { run: string; install?: never; dev?: never }

/** The same command for npm, pnpm, yarn and bun, as tabs for `CodeTabs`. */
function packageCommands(options: PackageCommandOptions): CodeTab[] {
  return managers.map((manager) => ({
    value: manager,
    label: manager,
    language: "shellscript",
    code:
      options.install !== undefined
        ? `${installs[manager]}${options.dev ? " -D" : ""} ${options.install}`
        : `${runs[manager]} ${options.run}`,
  }))
}

export { managers, packageCommands, packageManager }
export type { CodeTab, PackageCommandOptions, PackageManager }
