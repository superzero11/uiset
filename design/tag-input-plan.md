# Tag input: the plan

Planned on 2026-11-23, for the release on Wednesday 2026-11-25. Roadmap: Next 1, "The inputs
asked for most", which starts with this. Evidence: vercel-labs/ui#551, #569, #570, #550 and
#568 (all open; one author, so one signal), and the tag input among the most-voted shadcn/ui
asks (`research/brainstorm-2026-11-16.md`).

## What UI SDK has

`Combobox` with `multiple` draws chips beside its input. Checked in jsdom on beta.14, with
`allowCustomValue`:

- Enter commits the typed text as a chip, and the input clears.
- "c, d" then Enter makes one chip, "c, d" (#551).
- Text typed, then Tab: the text is lost (#570).
- ArrowLeft from the empty input focuses the last chip; Backspace on a chip removes it and
  focuses the one before; Backspace in the empty input removes the last chip.
- Enter on a chip does nothing: a chip can't be edited (#569).
- An agent sees a combobox with `setValue`, `clear`, `setQuery`; its value is the array.

`TokenInput` is text mixed with tokens (a prompt, a message): not a list of tags.

## What the tag input adds, on Combobox

1. **Delimiters.** A comma (or the `delimiters` given) commits what's before it; Enter always
   does. Pasting "a, b" or lines splits into one tag each.
2. **Commit when focus leaves** (`addOnBlur`, on by default).
3. **Edit a tag in place.** Enter or F2 on a focused chip, or a double-click, moves its text
   into the input and marks the chip as being edited, at its place; Enter saves it there,
   Escape puts the old tag back, and empty text removes it.
4. **Rules.** Trimmed, inner spaces collapsed. No duplicates, ignoring case by default
   (`unique`). `max` tags, `maxLength` per tag, and `validate(tag, tags)` returning a reason.
   A refused tag stays in the input (or, from a paste, is listed), and the reason shows
   under the field and is announced: "Already added: react", "Up to 10 tags".
5. **Suggestions** (optional). `suggestions` fills the list, filtered as you type; a pick
   adds it. Without suggestions there's no popup.
6. **Count.** With `max`, "3 of 10" under the field, like the textarea's count.
7. **Forms.** `name` submits one value per tag, through Combobox's own form support.
8. **Agents.** Combobox's `setValue` with an array. It goes through the same rules: a change
   that breaks one is canceled (`details.cancel()`) and the reason shows in the field, which
   an agent reads. Chip remove buttons are named "Remove react".

Behavior stays UI SDK's: chip focus, arrows, Backspace and the list are Combobox's. UISet's
own key handling is only what Combobox lacks: the delimiter keys, Enter and F2 on a chip, and
Escape while editing. The splitting and the rules live in `tag-input/tags.ts`, with no React,
shared by React and Web Components.

## Where it shows up

- **React:** `registry/uiset/ui/tag-input.tsx`, `tag-input/tags.ts`, `tag-input/tag-input.css`;
  registry item `tag-input` in the forms kit.
- **Web Components:** `<uiset-tag-input>` (`web/src/tag-input.ts`) on `<ui-combobox multiple>`,
  with a `change` event and `value`, `validate` and `suggestions` properties.
- **Schema form:** a `tags` field kind, React and Web Components: an array of strings,
  `{ type: "array", items: { type: "string" }, uniqueItems, maxItems }` in JSON Schema, filled
  by an agent by field name; the review lists the tags. The forms kit's demo form gets a
  Topics field, so it's live in the kit demo.
- **Site:** the forms kit page (a live example under its section), the gallery card and example,
  the docs nav, the looking-for table ("A tag input").
- **Web demo:** `web/content.html`, beside inline edit.
- **Docs and skills:** `docs/forms.md` (Parts, the section, Keys, For agents, Web Components),
  `docs/web-components.md`, `skills/uiset-forms`, `skills/uiset` (catalog), llms files by
  `registry:build`; CHANGELOG 0.7.0 Added; What's new with Wednesday's release.

## Looks

Chips per skin through variables on `[data-uiset][data-skin]`: Base soft pills; Blueprint
outlined rectangles on the grid; Studio small backlit keys; Phosphor inverse-video blocks;
Ink tags with a hand-drawn underline. The chip being edited is dashed. Text 4.5:1, chip edges
and focus 3:1 in every skin and theme.

## Tests

- Vitest through the agent bridge: delimiters, paste, blur, edit (save, Escape, empty), max,
  maxLength, unique, validate, suggestions, form values, an agent's `setValue` kept or
  refused with its reason; Web Components the same through `web-page.ts`. Each rule
  mutation-checked.
- Playwright: axe in five skins, light and dark, React and Web Components; `@engine` for chips
  wrapping beside the input and the edited chip's place (layout UISet wrote).
- Affected specs only until Wednesday's full run.
