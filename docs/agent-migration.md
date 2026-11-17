# Agent migration recipe

This page is written for a coding agent. It moves an app built with shadcn/ui (on Radix or
Base UI) to UISet, one component at a time, with a check after every step. The app builds at
every commit, and the people using it see the same screens. The person's version, with the
reasoning, is [Coming from shadcn/ui](./migrate-from-shadcn.md).

Give your agent this page:

```text
Move this app from shadcn/ui to UISet. Follow https://uiset.dev/docs/agent-migration.md
step by step. Run each step's check before starting the next, commit after each component,
and stop and tell me if a check fails twice.
```

An agent with the UISet skill (`npx skills add superzero11/uiset`) or Context7
(`/superzero11/uiset`) can look up every item's docs on its own.

The recipe was run end to end on a Vite app with 17 shadcn components (shadcn 4.23, Tailwind
4, React 19): about 20 commits, the build passing after each, and an agent-readiness score of
100 at the end.

## Before you start

The person does these:

- **React 19.** UI SDK needs it. Upgrade first if the app is on 18.
- **A clean branch.** Commit or stash everything, then branch.
- **Tests, if there are any.** The recipe leans on typecheck and build, and every test the app
  has makes a step safer.

## Rules for the agent

- **One component per step, one commit per step.** If a step breaks something you can't fix,
  reset to the last commit and report.
- **Don't change behavior or layout beyond the swap.** Same labels, same handlers, same data.
  Note anything that has to change in `MIGRATION.md` instead of improvising.
- **Behavior comes from UI SDK.** Never hand-write keyboard handling, focus traps or ARIA that
  a UI SDK component covers. Each component's API is in
  `node_modules/@ui-sdk/react/docs/components/<name>.md` once the root is installed.
- **Never let the CLI ask.** Without a terminal, `shadcn add` meets an existing file with
  "The file button.tsx already exists. Would you like to overwrite?", writes nothing, and
  still exits 0. Run `npx shadcn@latest add @uiset/<item> --dry-run` to see what it would
  overwrite, then add with `--overwrite` when replacing a shadcn file. `-y` doesn't skip that
  prompt.
- **Keep your own CSS out of `components/ui/uiset/`.** Every item depends on the root, so
  `--overwrite` rewrites the root's stylesheets too.

## Step 1: Take stock

Find the components folder (`aliases.ui` in `components.json`, usually
`src/components/ui` or `components/ui`), then list what's there, what uses it, and which
shadcn files import each other:

```bash
ls src/components/ui
grep -rhoE "from ['\"]@/components/ui/[a-z-]+['\"]" src | sort | uniq -c | sort -rn
grep -lE "components/ui/button['\"]|from ['\"]\./button['\"]" src/components/ui/*.tsx
grep -oE '"(radix-ui|@radix-ui/[a-z-]+|@base-ui[a-z/-]*|cmdk|vaul|sonner|react-day-picker|date-fns|input-otp|embla-carousel-react|recharts|react-resizable-panels|class-variance-authority|tw-animate-css)"' package.json
```

Write `MIGRATION.md` with one row per file in the components folder: the shadcn file, how
many files import it, the UISet item from the table below, whether it's replaced in place or
added beside, and a status column. Mark the files the third command found: they import
shadcn's button.

**Check:** every file in the components folder has a row, and every import the second command
found points at a row.

## Step 2: Record the baseline

Run the app's typecheck, tests and build, and write the results in `MIGRATION.md`. Failures
that exist now aren't yours to fix; failures that appear later are.

**Check:** the baseline is in `MIGRATION.md`.

## Step 3: Add the root

```bash
npx shadcn@latest add @uiset/uiset
```

Wrap the app's root (the layout in Next.js, `main.tsx` in Vite) once:

```tsx
import { UISet } from "@/components/ui/uiset"

export function Providers({ children }: { children: React.ReactNode }) {
  return <UISet skin="base">{children}</UISet>
}
```

The base skin reads the app's shadcn variables (`--background`, `--foreground`, `--primary`,
`--border`, `--radius` and the rest), so the theme carries over.

**Tailwind CSS 4 needs nothing here.** UISet puts its layer between Tailwind's reset and its
utilities, so the controls keep their look and the app's utility classes still win. If an
older copy of the root is installed (no `components/ui/uiset/layers.ts`), add it again with
`--overwrite`. In a server-rendered app (Next.js), also put
`@layer theme, base, uiset, components, utilities;` at the top of the global stylesheet, so the
first paint has that order too ([With Tailwind CSS](./installation.md#with-tailwind-css)).

Then pin UI SDK to the exact version the root installed, since npm saves it with a `^` and a
beta can change between versions:

```bash
npm install --save-exact @ui-sdk/core@<version> @ui-sdk/react@<version>
```

**Check:** typecheck and build pass, the pages render as before, and a `<button>` from UI SDK
on any page still has its padding and border.

## Step 4: Replace components, one at a time

**Order.** UISet's button doesn't export `buttonVariants`, and it has none of shadcn's sizes or
variant names, so replacing `button.tsx` first breaks every shadcn file that imports it (in the
test app: dialog, alert-dialog, sheet, calendar and pagination, 28 type errors). Move the files
Step 1 marked first, then the button. Leaves like badge, input, label, checkbox and switch can
go at any time. Do the sidebar, a data table, charts and forms last, each as its own step.

If one of the marked files has to wait, keep a copy of shadcn's button for it
(`git show HEAD:src/components/ui/button.tsx > src/components/ui/button-shadcn.tsx`), point
that file's import at the copy, and delete the copy when the last such file has moved.

For each component:

1. **Install it.** Same file name as shadcn's: `npx shadcn@latest add @uiset/<item>
   --overwrite`. Different name (the "added beside" rows below): `npx shadcn@latest add
   @uiset/<item>`, which leaves the old file in place.
2. **Typecheck.** Every error is a call site to update. Fix each with the notes below and the
   component's docs in `node_modules/@ui-sdk/react/docs/components/`. A prop that compiles
   isn't proof: shadcn's calendar `mode` and `selected` typecheck and do nothing.
3. **Move the imports** of an "added beside" item to the new file, then delete the old file.
4. **Update tests** that select by Radix's `data-state` (see "Everywhere" below).
5. **Check:** typecheck, tests and build pass, and `grep -r "components/ui/<old-name>" src`
   finds nothing for a deleted file. Mark the row done in `MIGRATION.md` and commit.

### What maps to what

These shadcn files have a UISet item of the same name, which replaces them in place:
`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`,
`carousel`, `checkbox`, `collapsible`, `combobox`, `command`, `dialog`, `drawer`, `field`,
`hover-card`, `input`, `kbd`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`,
`progress`, `resizable`, `scroll-area`, `select`, `separator`, `skeleton`, `slider`,
`spinner`, `switch`, `table`, `tabs`, `textarea`, `toggle` and `tooltip`.

The rest have another name, or stay:

| shadcn/ui file | UISet item | Lands |
|---|---|---|
| `breadcrumb` | `breadcrumbs` | added beside |
| `dropdown-menu`, `context-menu` | `menu` | added beside |
| `input-otp` | `otp-input` | added beside |
| `radio-group` | `radio` | added beside |
| `sheet` | `drawer` | added beside |
| `sonner` | `toast` | added beside |
| `toggle-group` | `toggle` (`ToggleGroup`) | added beside |
| `input-group` | `input` (`InputGroup`) | added beside |
| `empty` | `empty-state` | added beside |
| `item` | `item-list` | added beside |
| `sidebar` | `app-shell` | added beside, as its own step at the end |
| a data table on TanStack Table | `data-grid` | added beside, as its own step |
| `chart` (Recharts) | `line-chart`, `bar-chart`, `scatter-chart`, `heatmap`, `segmented-bar` | added beside, as its own step |
| `form` (React Hook Form) | none: keep it | stays; connect each UISet control through a `Controller` |
| `aspect-ratio`, `typography`, `button-group` | none: keep them | stay |

### Component by component

What the test app needed, beyond renaming imports:

- **button.** Variants are `solid` (the default), `outline` and `ghost`: `default` becomes
  `solid`, `secondary` becomes `outline`, `link` becomes `ghost` rendering an `<a>`, and
  `destructive` becomes `solid` with your own class plus `data-agent-confirm` saying what it
  does. There's no `size`: drop it, and keep an `aria-label` on icon-only buttons. `asChild`
  becomes `render`: `<Button render={<a href="/docs" />}>Docs</Button>`.
- **Triggers and close buttons** of dialogs, menus and popovers are buttons themselves. Instead
  of wrapping a `Button` with `asChild`, put the label inside the trigger and give it
  `data-variant="solid"`, `"outline"` or `"ghost"` for a button's look.
- **dialog.** No `DialogHeader` or `DialogFooter`: use your own `<div>`s. Add `<DialogBackdrop />`
  for the dimmed page, and a `DialogClose` where shadcn drew its corner ×.
- **alert-dialog.** No `AlertDialogHeader`, `Footer`, `Action` or `Cancel`. Both buttons are
  `AlertDialogClose`; the confirming one takes `value="confirm"`. Add `<AlertDialogBackdrop />`.
- **dropdown-menu → menu.** `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`. Give each item a
  `value` and handle choices once with `onAction={(value) => …}` on `Menu`, instead of
  `onSelect` on each item. `variant="destructive"` on an item becomes `destructive`; a label is
  `MenuGroupLabel` inside a `MenuGroup`. A context menu is `Menu` with `MenuContextTrigger`.
- **select.** `onValueChange` passes `string | null`, so `setState` for a string needs
  `(v) => setValue(v ?? "")`. `placeholder` moves from `SelectValue` to `Select`, and
  `<SelectLabel>` inside the `Select` names it, in place of a separate `Label`.
- **tabs.** `TabsTrigger` is `TabsTab` and `TabsContent` is `TabsPanel`. Name the tabs
  (`<Tabs aria-label="Settings sections">`): an agent needs it.
- **accordion.** `AccordionContent` is `AccordionPanel`.
- **sonner → toast.** UISet's toast exports `toast` and `Toaster`, and
  `toast("Saved", { description })` reads the same. Only the imports change.
- **calendar.** Dates are ISO strings: `value="2026-11-17"` and `onValueChange`, in place of
  `mode`, `selected` and `onSelect` with `Date` objects.
- **pagination.** A different model: the parts become one
  `<Pagination aria-label="Results pages" pageCount={…} getHref={(page) => …} />`.
- **sheet → drawer.** `Sheet`, `SheetTrigger` and `SheetContent` become `Drawer`,
  `DrawerTrigger` and `DrawerContent`. `side` moves from the content to `Drawer`, and
  `<DrawerBackdrop />` dims the page.
- **badge.** `variant` becomes `tone`: `neutral`, `info`, `success`, `warning` or `danger`.
- **tooltip.** There's no `TooltipProvider`; remove it.
- **card.** Unchanged, except there's no `CardAction`.
- **checkbox, switch, input, label, field.** Drop-in.

### Everywhere

- **Change handlers** are `onValueChange`, `onOpenChange`, `onCheckedChange` and
  `onPressedChange`, with a second `details` argument that says why the value changed.
- **State attributes.** Radix's `data-state="open"` and `data-state="checked"` are
  `data-open` and `data-checked` (also `data-pressed`, `data-highlighted`, `data-disabled`),
  and every part has a `data-slot`.
- **Styling.** Tailwind classes on any part win over UISet's styles, so the app's own classes
  keep working.

## Step 5: Remove what nothing uses

When the last component that used a package is gone, uninstall it. shadcn's Radix style
depends on the `radix-ui` package (older apps on `@radix-ui/*`), plus `class-variance-authority`,
`tw-animate-css`, `sonner`, `react-day-picker` and `date-fns`:

```bash
grep -rl "from \"sonner\"" src || npm uninstall sonner
```

Do the same for each package Step 1 found, and delete `components/ui` files that nothing
imports. Keep `cn` in `lib/utils.ts` while the app's own code uses it, and remove the
`tw-animate-css` import from the stylesheet with its package.

**Check:** typecheck, tests and build pass.

## Step 6: Check that an agent can use it

An agent operates the app through UI SDK's agent bridge, so create one once, in its own module
imported by the app's entry (`main.tsx` in Vite, a client component in Next.js):

```ts
// src/agent.ts
import { createAgent, registerTools } from "@ui-sdk/react/agent"

const agent = createAgent()

// Ask a person before an agent presses anything.
const unregister = registerTools(agent, {
  allow: (step) => step.action !== "press" || confirm(`Press ${step.args[0]}?`),
})

// Vite only: drop the old tools when the module reloads.
if (import.meta.hot) import.meta.hot.dispose(unregister)

export { agent }
```

Then run the readiness check against the running app and its main pages:

```bash
npx shadcn@latest add @uiset/agent-check
npx tsx src/components/ui/agent-check/cli.ts http://localhost:5173 /settings /billing
```

It uses the bridge when it finds one and scores each page. Add `--channel chrome` to use the
installed Chrome instead of downloading Playwright's Chromium. In the test app it found an unnamed
set of tabs, three names that each found two controls ("Save" in "Save profile", "Delete" in
"Delete account", "Email" in "Email notifications") and a Delete with no
`data-agent-confirm`. Fix each (a name, a more specific label, a confirmation), then add
`expectAgentReady` to the app's tests so it stays that way. See
[Agent readiness check](./agent-check.md).

**Check:** every page scores 100, or each remaining problem is listed in `MIGRATION.md` with
the reason it stays.

## Step 7: Report

Finish `MIGRATION.md` with:

- what moved, and the commits;
- what stayed and why (`form`, charts, anything UISet doesn't have);
- the agent-readiness score of each page;
- checks that fail, with the error.

Then hand it back to the person to review the branch.
