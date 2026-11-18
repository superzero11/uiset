<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.10, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Pagination

- `page?` (`number`): The current page, from 1. Pass it to control the pagination.
- `defaultPage?` (`number`): The page it starts on, when uncontrolled.
- `onPageChange?` (`((page: number, details: ChangeDetails<PaginationPageChangeReason>) => void)`): Runs when the page wants to change: a page link (`"item-press"`), the Previous, Next, First or Last part, or a controller (`"imperative"`). `details.cancel()` keeps the page, and stops a link from navigating.
- `pageCount?` (`number`): How many pages there are. Or pass `total` and `pageSize`.
- `total?` (`number`): How many items there are, for `pageCount` from `pageSize`.
- `pageSize?` (`number`): How many items fit on a page, with `total`.
- `siblings?` (`number`): How many pages show on each side of the current one.
- `boundaries?` (`number`): How many pages always show at each end.
- `getHref?` (`((page: number) => string)`): The URL of a page. With it, parts are links: they navigate, open in a new tab with a modifier key, and work before JavaScript loads. Without it, they're buttons.
- `disabled?` (`boolean`): Whether every page and step does nothing, like a step at its end. A controller still pages it.
- `controller?` (`object`): Pages it from anywhere. Create one with `createPaginationController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### PaginationLink

- `page` (`number`): The page the link goes to, from 1.

`PaginationList`, `PaginationItem`, `PaginationPrevious`, `PaginationNext`, `PaginationFirst`, `PaginationLast` and `PaginationEllipsis` take no props of their own.

### State

What render functions, state-based class names and slots receive, per part.

`Pagination` and `PaginationList`:

- `page` (`number`): The current page, from 1.
- `pageCount` (`number`): How many pages there are.
- `items` (`PaginationRangeItem[]`): The pages to show, with an ellipsis for each gap. Render a PaginationLink or a PaginationEllipsis for each.

`PaginationLink`:

- `page` (`number`): The page it goes to, from its `page` prop.
- `current` (`boolean`): Whether it's the current page.

`PaginationPrevious`, `PaginationNext`, `PaginationFirst` and `PaginationLast`:

- `page` (`number`): The page it goes to.
- `disabled` (`boolean`): Whether it's at the end it goes to, or the pagination is disabled, so it does nothing.

### Reasons

`details.reason` says why the page changed.

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `previous-press` (`MouseEvent | KeyboardEvent`): A pagination's or a carousel's Previous part was pressed.
- `next-press` (`MouseEvent | KeyboardEvent`): A pagination's or a carousel's Next part was pressed.
- `first-press` (`MouseEvent | KeyboardEvent`): A pagination's First part was pressed.
- `last-press` (`MouseEvent | KeyboardEvent`): A pagination's Last part was pressed.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createPaginationController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, passed to `onPageChange`, and returns `false` when the change is canceled or there's nowhere to go.

- `getPage()` (`() => number`): The current page, from 1.
- `getPageCount()` (`() => number`): How many pages there are.
- `setPage(page, options?)` (`(page: number, options?: PaginationChangeOptions | undefined) => boolean`): Goes to a page, clamped to the range. Returns false when canceled or already there.
- `next(options?)` (`(options?: PaginationChangeOptions | undefined) => boolean`): Goes to the next page. Returns false on the last page.
- `previous(options?)` (`(options?: PaginationChangeOptions | undefined) => boolean`): Goes to the previous page. Returns false on the first page.
- `first(options?)` (`(options?: PaginationChangeOptions | undefined) => boolean`): Goes to the first page.
- `last(options?)` (`(options?: PaginationChangeOptions | undefined) => boolean`): Goes to the last page.

### Events

Callbacks get the new page first, then the details.

| Prop           | On           | Receives                                                    |
| -------------- | ------------ | ----------------------------------------------------------- |
| `onPageChange` | `Pagination` | `(page, details)`: the new page, and the [reason](#reasons) |

## Accessibility

There's no WAI-ARIA pattern for pagination. It follows the common practice: a `navigation` landmark named with `aria-label`, a list of links or buttons, and `aria-current="page"` on the current one. The list keeps the `list` role even when styled without bullets, which Safari would otherwise drop.

### Focus

Steps rendered as buttons stay focusable at the ends. A clicked page link keeps focus as the range moves; the primitive also tries to restore focus to that page or step if rendering replaces its element. Key range entries by their value rather than their index.

### Tested Behavior

Every line below is an automated test.

- The pagination is a named navigation landmark with a list of pages.
- The first page is current to start with, or the default page.
- Pressing a page goes there.
- Enter on a focused page goes there.
- Space on a focused page goes there.
- Next and Previous step one page.
- First and Last go to the ends.
- First and Previous say they're disabled on the first page, and do nothing.
- Next and Last say they're disabled on the last page, and do nothing.
- A single page has nothing to step to.
- Siblings and boundaries widen the range.
- Ellipses are hidden from screen readers.
- With getHref, pages and steps are links to their pages.
- A link at an end has no href and says it's disabled.
- Pressing a link goes to its page and follows it.
- A change can be canceled.
- A canceled change stops a link from navigating.
- The controller pages it from outside.
- A controlled pagination follows its owner. React and Vue only.

Runs in React, Vue and web components.

Beyond the baseline:

- Pressing Next onto the last page keeps focus on Next.
- Pressing Previous onto the first page keeps focus on Previous.
- Paging through every page with the keyboard never loses focus.
- Pressing a page keeps focus on it while the range moves around it.
- Focus comes back to the same part when the list renders again from scratch. React and Vue only.
- The list has the same number of entries on every page, so nothing shifts under the pointer.
- A gap of one page shows that page instead of an ellipsis.
- A link pressed with a modifier opens elsewhere and leaves the page as it is.
- The list keeps its list role when styled without bullets.
- Steps at the ends stay in the tab order and say they're disabled.
- A Next link goes to the next page, not past it, even after the page renders again.
- A Next link onto the last page still goes there, though it ends there.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while paging with a keyboard.

Runs in React, Vue and web components.
