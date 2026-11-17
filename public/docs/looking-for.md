# Looking for a component?

The components people ask for most, and where each one is in UISet. If you came from
shadcn/ui with a list of things you had to find elsewhere, start here.

Everything below installs the same way:

```bash
npx shadcn@latest add @uiset/<item>
```

## Asked for most

| You're looking for                     | In UISet                                                            | Item                       |
| -------------------------------------- | ------------------------------------------------------------------- | -------------------------- |
| A full calendar with events            | Day, week and month views, overlapping events you drag, resource lanes | [`scheduler`](./scheduler.md), and the `calendar-app` page |
| A time picker                          | A time typed segment by segment; a scroll wheel for phones          | `time-input`, `TimeWheel` in [`mobile`](./mobile.md) |
| Multi-select                           | Combobox with `multiple`: chips in the field, the list stays open   | `combobox`                 |
| A date picker with year select, presets and typing | `CalendarYearSelect`, `DatePickerPreset`, and a typed date field | `date-picker`, `date-input` |
| A date range                           | Calendar and date picker take a range                               | `calendar`, `date-picker`  |
| A dropzone and file upload             | Drop, paste or choose files; then a queue with progress, cancel and retry | `file-input`, [`upload`](./forms.md#upload) |
| A data table                           | Sorting, filters, grouping, pinned columns, editing, virtual rows   | [`data-grid`](./data-grid.md) |
| A plain table with a fixed header      | Sticky headings and first column; rows stack on phones              | [`table`](./app-shell.md#table) |
| A tag input                            | Text mixed with tokens; or a combobox with chips                    | `token-input`, `combobox`  |
| A rich text editor                     | Headings, lists, links, images, mentions, Markdown in and out       | [`rich-text`](./rich-text.md) |
| Charts                                 | Line, bar, scatter, heatmap and more, explored by keyboard, with a table view | [charts](./charts.md) |
| A stepper or wizard                    | Steps with the current one marked and later ones locked             | `stepper`                  |
| A kanban board                         | Cards moved by drag or keyboard, column limits, filters             | [`board`](./board.md)      |
| A timeline                             | Events in order with markers                                        | `timeline`                 |
| A file tree                            | A tree you expand and select; a file tree with rename and move      | `tree`, [`ide`](./ide.md)  |
| A spinner and loading states           | A spinner that says what's loading; skeletons                       | `spinner`, `skeleton`      |
| A sidebar                              | Collapses to icons, becomes a drawer on phones                      | [`app-shell`](./app-shell.md) |
| A chat interface                       | Messages that stream, reasoning, tool calls and sources, a message box with mentions and attachments | [`chat`](./chat.md) |
| A code block                           | Syntax colors, copy, line numbers, package-manager tabs             | [`code-block`](./app-shell.md#code) |
| Inline editing                         | Press a value to edit it in place                                   | [`inline-edit`](./forms.md#inline-edit) |
| An avatar stack                        | Overlapping avatars with a count of the rest                        | `avatar-group`             |
| A notification count on an icon        | A count badge on a button or avatar                                 | `CountBadge` in `badge`    |

## Also here

| You're looking for                     | In UISet                                                            | Item                       |
| -------------------------------------- | ------------------------------------------------------------------- | -------------------------- |
| A color picker                         | Area, hue and alpha sliders, swatches, hex input                    | `color-picker`             |
| A rating                               | Stars, whole or half                                                | `rating`                   |
| Pagination                             | Page links with named previous and next                             | `pagination`               |
| A carousel                             | Slides with keyboard paging                                         | `carousel`                 |
| A number input                         | A number field with step buttons                                    | `number-input`             |
| A one-time code field                  | A slot per character                                                | `otp-input`                |
| Mentions and slash commands            | Suggestions after @, / or # in any text field                       | `trigger-menu`             |
| An image cropper                       | Crop, zoom, rotate and flip                                         | `image-cropper`            |
| A command palette                      | A searchable list of commands                                       | `command`                  |
| A drawer or bottom sheet               | A sheet from an edge of the screen, with snap points                | `drawer`                   |
| A dialog on desktop, a sheet on phones | `presentation="auto"` on Dialog and Select                          | `dialog`, `select`         |
| A confirm dialog you can call          | `await confirm({ title, confirmLabel })` from anywhere, with UI SDK's `OverlayHost` rendered once | `alert-dialog` |
| Tabs that are links                    | `<TabsTab render={<a href="/activity" />}>`                         | `tabs`                     |
| Bottom navigation and pull to refresh  | `TabBar` and `PullToRefresh`                                        | [`mobile`](./mobile.md)    |
| A node editor                          | Nodes, wires, a minimap, undo                                       | [`canvas`](./canvas.md)    |
| A terminal                             | Commands, history, streaming output                                 | [`terminal`](./terminal.md) |
| Resizable panels                       | Drag or use the keyboard                                            | `resizable`                |

## Whole pages

Sign in and sign up, a dashboard, settings, an admin records page, an inbox, a chat app, a
project board, a calendar, pricing and an IDE are [page templates](./templates.md): one command
each, built only from the items above.

## Questions that come up

- **Do I need Tailwind?** No. UISet is plain CSS in cascade layers. Tailwind keeps working
  beside it: UISet sits between Tailwind's reset and its utilities, so your utility classes
  win ([With Tailwind CSS](./installation.md#with-tailwind-css)).
- **Does it work outside React?** Yes. Every kit and template is also a custom element in
  `@uiset/web`, for [Vue](./vue.md), [Svelte](./svelte.md), Solid, Angular and plain HTML.
  See [Web Components](./web-components.md).
- **Can I keep my shadcn theme?** Yes. The base skin reads your shadcn variables. See
  [Coming from shadcn/ui](./migrate-from-shadcn.md).
- **It isn't on this page.** [Open an issue](https://github.com/superzero11/uiset/issues)
  with what you're building. What many people need comes first.
