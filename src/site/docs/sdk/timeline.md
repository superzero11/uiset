<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

### Timeline

- `orientation?` (`TimelineOrientation`): Which arrow keys move between events: up and down, or left and right.
- `loop?` (`boolean`): Whether arrow keys wrap from the last event to the first.
- `feed?` (`boolean`): Whether the events are a feed that loads more as people scroll, rather than a list. Each event becomes an article with its position, and Page Down and Page Up move between them from anywhere inside one.
- `busy?` (`boolean`): Whether a feed is loading or changing events, which sets `aria-busy` so screen readers wait until it's done. Only a feed reads it.
- `controller?` (`{ focus: (value?: string) => void; }`): Focuses an event from anywhere. Create one with `createTimelineController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### TimelineItem

- `value?` (`string`): Names the event for the controller's `focus()`. Generated when left out.
- `status?` (`TimelineStatus`): Where the event stands in a process. The `"current"` one sets `aria-current="step"` and takes the tab stop first.

`TimelineMarker`, `TimelineConnector`, `TimelineTime`, `TimelineTitle` and `TimelineDescription` take no props of their own.

### State

What render functions and state-based class names receive on `Timeline`:

- `orientation` (`TimelineOrientation`): Which way the events run.
- `feed` (`boolean`): Whether the events are a feed rather than a list.
- `busy` (`boolean`): Whether a feed is loading or changing events.

On `TimelineItem` and every part inside it:

- `status` (`TimelineStatus | undefined`): Where the event stands in a process, or `undefined` when it has no status.
- `orientation` (`TimelineOrientation`): Which way the events run.

### Controller

- `focus(value?)` (`(value?: string | undefined) => void`): Moves focus to an event by its `value`, or to the event that holds the tab stop.

## Accessibility

A timeline is a `list` of `listitem`s, named with `aria-label`. With `feed`, it follows the [WAI-ARIA feed pattern](https://www.w3.org/WAI/ARIA/apg/patterns/feed/): a `feed` of `article`s, each with `aria-posinset` and `aria-setsize`, and `aria-busy` while it loads. Each event is named by its title through `aria-labelledby` and described by its time and description through `aria-describedby`. The current event has `aria-current="step"`.

### Keyboard

The events have one tab stop, a roving focus. Tab enters on the current event, else the first, then returns to the event focused last. Markup rendered on the server holds the stop on the first event until it hydrates.

| Key                        | Action                                                     |
| -------------------------- | ---------------------------------------------------------- |
| `ArrowDown` / `ArrowUp`    | Move focus between events in a vertical timeline           |
| `ArrowRight` / `ArrowLeft` | Move focus between events in a horizontal timeline         |
| `Home` / `End`             | Focus the first or last event                              |
| `PageDown` / `PageUp`      | In a feed, focus the next or previous article, from inside |
| `Tab`                      | Move from an event to the links and buttons inside it      |

Arrow keys move only from an event itself, so controls inside keep them. In right-to-left text, Left and Right swap.

### Tested Behavior

Every line below is an automated test.

- A busy feed sets aria-busy.

**A list of events**

- The events are a named list of list items.
- Each event is named by its title and described by its time and description.
- Tab lands on the current event, then on the links inside it, then leaves.
- The current event says it's the current step.
- Each event and its parts show its status.
- ArrowDown and ArrowUp move between events.
- ArrowLeft and ArrowRight do nothing in a vertical list.
- Home and End move to the first and last events.
- Arrow keys wrap from the last event to the first.
- Arrow keys on a link inside an event leave focus on the link.
- Page Down does nothing in a list.
- Tab comes back to the event focused last.
- Only the event with the tab stop is in the tab order.
- The first and last events are marked.
- An event added at the top becomes the first.
- Events that change places move the first and last marks.
- Each event carries its place and the list how many there are.
- The tab stop follows the current step when it moves before focus enters.
- The controller moves focus to an event.
- Markers and connectors are hidden from assistive technology.

**A list that doesn't loop**

- Arrow keys stop at either end.

**A horizontal list**

- ArrowRight and ArrowLeft move between events.
- ArrowDown and ArrowUp do nothing.

**A feed**

- The events are a named feed of articles.
- Each article says where it sits and how many there are.
- An article added at the top moves every position.
- Articles moved inside a wrapper take their new places.
- Page Down and Page Up move between articles.
- Page Down from a link inside an article moves to the next article.
- Page Down on the last article stays there.
- The feed isn't busy until it's told.

Runs in React, Vue and web components.
