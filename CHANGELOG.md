# Changelog

UISet follows UI SDK's beta. Each release pins exact `@ui-sdk/*` versions, and the notes say
which. Until UI SDK reaches 1.0, a minor release of UISet (0.2, 0.3) may change an API;
those changes are listed under **Changed** with what to do. Patch releases only fix things.

Registry items are source code copied into your app. To take a release, add the items
again (`npx shadcn@latest add @uiset/<item>`) and review the diff.
`@uiset/web` is a package: update it like any other.

## 0.4.0 (unreleased)

### Added

- **`agent-check`**: whether an agent can use a page. It asks the page's UI SDK agent bridge,
  in any framework, and scores the page by the share of controls an agent can find by name.
  It reports components with no name, names that find more than one component (a step by
  that name fails), and controls a person can reach that agents can't see, with destructive
  buttons lacking `data-agent-confirm` and pages past 100 components as warnings.
  `expectAgentReady` for tests, `checkPage` for Playwright (through the tools a page
  registers with WebMCP, or a global), and a command that checks pages by URL. See
  [Agent readiness check](./docs/agent-check.md).
- **Every page template and Web Components page scores 100** on `agent-check`, and a test in
  each browser holds them there. Its first run on them scored the templates 50 to 91.

### Changed

- **Install lines use the `@uiset` namespace**, now that shadcn's registry directory lists it:
  `npx shadcn@latest add @uiset/<item>`. `superzero11/uiset/<item>` and
  `https://uiset.dev/r/<item>.json` still work.

What agents see, so a name finds one component. Update agent steps or tests that used the
old names:

- **Chat threads** are named "Open <title>" (React and Web Components), beside each one's
  "More for <title>" menu, as UI SDK advises for a row's controls.
- **The data grid's search field and Group by select are hidden from agents**, who use the
  grid's own `filter` and `groupBy`; their names, which hold the grid's, made the grid's name
  find two components. The web grid's filters popover too (`filterColumn`).
- **A chart's legend is hidden from agents**, who use the chart's own `isolate`.
- **The app shell's sidebar tooltips, and the inbox's Compose and the calendar's New event
  tooltips, are hidden from agents.** A closed tooltip takes its trigger's name in UI SDK's
  bridge (vercel-labs/ui#604), so the name found two components.

### Fixed

- **IDE:** the editor's tabs are named "Open files" for agents, who saw the first file's name
  (React) or no name (Web Components); the command palette has a name while closed (its
  content stays mounted, so its title names it); a problem's name has a space between its
  message and its place ("…before shipping. index.ts:7:1"); the template's file tree is
  "Project files".
- **Calendar app:** the upcoming events are UI SDK buttons, so agents can open them.
- **Web Components:** tables, code blocks and code tabs carry their name on the root
  element, which the web bridge reads, and the avatar group names each avatar as an image
  from its picture's alt text or its hidden name.
- **Templates:** the auth template's "Email me a sign-in link" is "Send me a one-time link",
  and the schema form example's Name field is "Full name".

## 0.3.0 (2026-11-17)

On UI SDK `0.1.0-beta.5`. The first `@uiset/web` on npm since 0.1.1: 0.2.0 wasn't published
on its own, so this release carries its changes too, including the two under its
**Changed**. Nothing in 0.3.0 itself changes how existing code works.

### Added

- **`schema-form`**: a form drawn from one definition. `defineForm` declares the fields
  (text, email, link, phone, long text, number, choice, yes or no, date) with their checks,
  and optional steps; the values' type comes from it. `SchemaForm` draws it with UISet's
  controls, shows each problem under its field (as people leave a field, and on Next or
  Submit, with focus on the first), walks the steps to a review, and shows the problems
  your `onSubmit` sends back on their step. Any Standard Schema (zod, valibot, arktype)
  adds rules across fields. An agent sees the form as one component and fills it by field
  name or label with `fill`, hearing exactly what's wrong; the submit carries
  `data-agent-confirm`, so a person sends it. `formTool` and `registerFormTool` make the
  same definition an agent tool, for a model SDK or the browser's agent (WebMCP). Enter in
  any field of a step goes on, and focus follows the steps. React, and
  `<uiset-schema-form>` for Web Components, where `send` returns the problems and `value`
  works with `v-model`; `@uiset/web` exports `defineForm` and `formTool`. See
  [Forms](./docs/forms.md#schema-form).

### Fixed

- **`<uiset-stepper>`** steps ahead of the current one in a linear flow looked enabled:
  `disabled` is now on UI SDK's button wrapper, which marks the button for the skins, as
  React's are.
- **Stepper** labels center on their numbered marks at any line height, and the marks keep
  their size on a page without a `border-box` reset.

## 0.2.0 (2026-11-17)

On UI SDK `0.1.0-beta.5`. A minor release: two things work differently, each under
**Changed** with what to do. `@uiset/web` 0.2.0 wasn't published to npm; 0.3.0 has these
changes.

### Added

Five items, from what people ask shadcn/ui and UI SDK for most, in React and as Web
Components.

- **`table`**: a plain HTML table in a UI SDK scroll area. Sticky headings, a sticky first
  column, and rows that stack into labelled blocks below 30rem of the table's own width.
- **`avatar-group`**, and **`CountBadge`** in `badge`: avatars overlapping in a row with a
  count of the rest, and a count on the corner of an icon button or avatar.
- **`code-block`**: `CodeBlock` (colors, file name, line numbers, marked lines, copy),
  `CodeTabs`, and `PackageCommand`, one command for npm, pnpm, yarn and bun that remembers
  the choice.
- **`inline-edit`**: text you edit where it shows, on UI SDK's `createInlineEdit`, with
  validation and optional Save and Cancel buttons.
- **`upload`**: a drop zone and a queue of uploads on UI SDK's File input: previews,
  progress, cancel, retry and remove, a few at a time, to whatever storage you use.
- **Docs**: [Looking for a component?](./docs/looking-for.md) maps the most-requested
  components to UISet items, and [Forms](./docs/forms.md) covers inline edit and upload.
- **Guides for [Vue](./docs/vue.md) and [Svelte](./docs/svelte.md)**: setup, passing data,
  events, two-way binding, skins, server rendering, and UI SDK's own Vue and Svelte
  components under UISet's stylesheet. Every code block ran in a new app of each.
- Two icons, `upload` and `retry`.
- **The same five for Web Components**: `<uiset-table>`, `<uiset-avatar-group>`,
  `<uiset-count-badge>`, `<uiset-code-block>` with `<uiset-code-tabs>` and
  `<uiset-package-command>`, `<uiset-inline-edit>` and `<uiset-upload>`, sharing React's CSS,
  the inline edit primitive, the upload queue and the package-manager choice. See
  [Web Components](./docs/web-components.md#content-and-forms).
- **`@uiset/web` ships TypeScript types.** `document.querySelector("uiset-data-grid")` and
  `createElement` know each element by its tag, and the types are exported by name
  (`UISetDataGrid<Row>`, `UISetBoard`, `UISetLineChart<Datum>`, …): every element a page
  works with, including the kits' script APIs. The grid and the charts take your row type.
- **`@uiset/web` events are typed.** `addEventListener` on an element knows its own events
  (`grid.addEventListener("celledit", (e) => e.detail.row)`), and each element's events are
  exported as a map for a template's listener: `UISetKnobEvents["valuechange"]`,
  `UISetDataGridEvents<Order>["celledit"]`.
- **`v-model` on every `@uiset/web` element with a value.** The stepper, knob, patch bay,
  wheel, rich text, code editor, chat composer, chat threads, model picker, file tree and
  editor tabs now have a live `value` and fire `input` once a change is in (and `change` for
  a finished choice), as the search field already did. Vue's server compiler doesn't allow
  `v-model` on custom elements; the guides show the value-and-event pair for that case.
- **Server-rendered HTML hydrates cleanly.** Under an ancestor with `data-uiset-hydrating`,
  `@uiset/web`'s elements are defined but wait to draw until the attribute is removed, so
  Vue and Svelte hydrate the HTML they rendered and set your data as properties. Remove the
  attribute once hydration is done. Before this, the app shell's layout broke Vue's
  hydration of the whole page, and loading the module after hydration left the grid and
  stepper empty. The [Vue](./docs/vue.md#server-rendering) and
  [Svelte](./docs/svelte.md#server-rendering) guides have the recipe.

### Changed

- **Data grid: a column's `options` open in the skin's own list.** The editor for a column
  with `options` was a text field with the browser's list, which no skin can style. It is
  now UI SDK's Combobox in the cell: the list opens under the cell, typing narrows it, the
  arrows move through it, and Enter, Tab or a press saves the highlighted option. Text
  that matches no option can no longer be typed in and refused; the list says "No match".
  Pasted and agent edits are still checked against the list. The `data-grid` item now
  depends on `combobox`: add it again to take the change. React and `@uiset/web`.
- **`<uiset-knob>`'s `value` stays live.** Once a page set `value`, the knob held it: a
  person's turn fired `valuechange` but didn't move the knob until the page set `value`
  again. Now a turn moves it, as a slider's does, and `preventDefault()` on `valuechange`
  refuses it. A page that set `value` on every `valuechange` needs no change.

### Fixed

`@uiset/web`, from writing the Vue and Svelte guides against real apps:

- **Bound attributes reach the element.** An attribute that shared its name with a
  read-only member or a method (the grid's `label`, `locale`, `selectable` and `editable`,
  the search field's `label` and `shortcut`, the editor's `label`, the activity's `source`)
  couldn't be set from a Vue template, which sets a property when it finds one. Each is now
  a property that writes its attribute.
- **`"false"` turns a presence attribute off.** Vue and Svelte write `toolbar="false"` for a
  false binding, and the toolbar stayed. `"false"` is now off everywhere: the grid's
  `toolbar`, `selectable` and `editable`, the chat's flags, the editor's `readonly`, the
  canvas's `history` and `renamable`, and the root's `sound` and `haptics`.
- **A sparkline's `values` and a stat's `trend` take the attribute's text as a property**
  (`"4,6,,8"`), as well as an array.
- **The search field's Clear fires `input`**, so `v-model` and other two-way bindings follow
  it. `valuechange` still fires once.
- **The app shell places children added after it mounts**, by the same `data-part` rules.
- **`uiset.css` no longer carries the demo pages' rules.** It set a font, a margin and a
  minimum height on `body` and loaded a web font. The stylesheet now reaches only UISet's
  root and what's inside it.
- **`<uiset-copy-button>` says when copying fails.** A refused clipboard failed silently; it
  now announces "Couldn't copy", as React's does. It also takes `full-label`, a fuller name
  like "Copy app.tsx" where several share a page.
- **The module can be imported where there's no browser.** Importing `@uiset/web` in Node
  threw `HTMLElement is not defined`, so server-rendered apps had to guard the import.

React and both:

- **Data grid: the editor's ring stays inside its cell.** While a cell was being edited its
  focus ring was drawn four pixels outside it, over the pinned column's edge and the rows
  above and below. React and `@uiset/web`.
- **Canvas: a node an agent adds can be used at once.** `addNode` returned before React had
  drawn the node, so an agent's next step ("connect Draft answer to Log") could fail with
  "No node". Seen in Firefox. The node is now rendered before the call returns.
- **Patch bay inside a scaled container.** Cables are now measured in the patch bay's own
  pixels, so they stay on their jacks, and a cable being dragged stays under the pointer, when
  something above it scales it (a zoomed canvas, a CSS transform). React and `@uiset/web`.
- **Mobile: a wheel keeps a value set while its sheet is still opening.** In WebKit, an
  agent's `setValue` on a wheel in a sheet that had just opened was sometimes lost: the
  wheel stayed on the old option, and the sheet coming to rest then scrolled it to a third
  one. UI SDK's scroll picker skips a selection that arrives while a scroll is settling; the
  wheel now puts its value back in the band when that happens (`mobile/wheel.ts`). React
  and `@uiset/web`.

## 0.1.1 (2026-11-16)

On UI SDK `0.1.0-beta.5`.

### Changed

- **UI SDK `0.1.0-beta.5`.** Every item now pins `@ui-sdk/core`, `@ui-sdk/react` and
  `@ui-sdk/web` at `0.1.0-beta.5`. UISet needed no code changes; its tests pass on it. To
  take it, add your items again and update the `@ui-sdk/*` versions in your package.json.
  `@uiset/web` 0.1.1 has the new peer versions.

## 0.1.0 (2026-11-16)

The first public release, on UI SDK `0.1.0-beta.2` (`@ui-sdk/core`, `@ui-sdk/react`,
`@ui-sdk/web`).

### Added

- **`<UISet>` root**: skins as CSS variables that nest without leaking, a key color in
  OKLCH that adopts an existing shadcn/ui theme, light and dark, and sound and haptic cues
  for every UI SDK component inside it.
- **Five skins**: base, blueprint, studio, phosphor and ink, each checked for contrast in
  light and dark, with forced colors, reduced motion and right-to-left support.
- **Components**: all 55 of UI SDK's components, styled, plus 16 app frame and data display
  parts (app shell, sidebar, page header, card, stepper, badge, stat, empty state and more).
- **Twelve kits**: chat, rich text editor, data grid, charts, board, scheduler, node canvas,
  IDE, mobile patterns, terminal, Studio (a synth rack with sound) and the Agent Console.
- **Ten page templates**: auth, dashboard, settings, admin, inbox, chat app, project board,
  calendar app, pricing and IDE app.
- **Web Components**: every kit and template as custom elements, for Vue, Svelte, Solid,
  Angular and plain HTML (`@uiset/web`).
- **For agents**: every control named for UI SDK's agent bridge, the Agent Console with
  approvals and undo, a benchmark on UISet's kits (bridge against browser tools), `uiset`
  skills for coding agents, and `llms.txt` and `llms-full.txt`.
- **Tested in Chrome, Safari and Firefox**, for React and Web Components, with axe in every
  skin and theme.
- **Docs and tools**: a docs site with a page for every item, including live examples,
  their code, UI SDK's API reference and what an agent reads; a theme generator that turns
  one color into a checked theme and exports a UISet skin, shadcn/ui variables or design
  tokens; and a guide for moving from shadcn/ui.
