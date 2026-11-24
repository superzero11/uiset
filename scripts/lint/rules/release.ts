// What a push checks. A push to main deploys uiset.dev, so what the site will say has to hold
// for what's on npm right now. It reads npm, so only `pnpm lint --push` (the pre-push hook) runs it.

type Published = { version: string; peerDependencies?: Record<string, string> }

export const docsAheadOfNpm = {
  id: "release/docs-ahead-of-npm",
  why: "2026-11-24: main moved to UI SDK beta.16, docs included, and a push deployed them while npm's @uiset/web was still 0.6.1, which takes beta.14 only: the Web Components docs' npm install line failed with ERESOLVE. The owner approved the push; checking that it was safe was the agent's job, and it was missed. A push waits until npm's @uiset/web (and @uiset/solid, once the docs name it) takes the UI SDK version package.json pins: publish first, then push.",
  /**
   * What's wrong with deploying docs that pin UI SDK `pin` while npm's latest `pkg` is
   * `published` (null when npm has none), or null. `peers` are the UI SDK packages it takes.
   */
  check(pin: string, published: Published | null, pkg = "@uiset/web", peers = ["@ui-sdk/web", "@ui-sdk/core"]): string | null {
    if (!published) return `The docs tell people to install ${pkg}, and this push deploys them to uiset.dev, but npm has no ${pkg}. Publish it first, then push.`
    const wrong = peers.filter((name) => published.peerDependencies?.[name] !== pin)
    if (!wrong.length) return null
    const wants = wrong.map((name) => `${name} ${published.peerDependencies?.[name] ?? "(none)"}`).join(" and ")
    return `The docs pin UI SDK ${pin}, and this push deploys them to uiset.dev, but npm's ${pkg} ${published.version} takes ${wants}: an install by the docs fails. Publish ${pkg} first, then push.`
  },
}
