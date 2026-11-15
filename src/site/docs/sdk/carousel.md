<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Carousel

- `page?` (`number`): The current page, from 1. Pass it to control the carousel.
- `defaultPage?` (`number`): The page it starts on, from 1, when uncontrolled.
- `onPageChange?` (`((page: number, details: ChangeDetails<CarouselPageChangeReason>) => void)`): Runs when the page wants to change. `details.reason` says why, and `details.cancel()` stays on the page.
- `onPageChangeComplete?` (`((page: number) => void)`): Runs once the slides come to rest on a page, after a spring, a drag or a scroll, with that page. Start work there that would stutter the motion.
- `playing?` (`boolean`): Whether it rotates through the pages on its own. Pass it to control rotation.
- `defaultPlaying?` (`boolean`): Whether it starts rotating, when uncontrolled. It doesn't when the user prefers reduced motion; the play toggle still starts it.
- `onPlayingChange?` (`((playing: boolean, details: ChangeDetails<CarouselPlayingChangeReason>) => void)`): Runs when rotation wants to start or stop. Keyboard focus moving in and the user paging stop it, as the carousel pattern asks.
- `interval?` (`number`): How long each page shows while rotating, in ms. Hovering, a hidden tab and scrolling the carousel out of view pause it.
- `orientation?` (`CarouselOrientation`): Which way the slides scroll, and which arrow keys page.
- `align?` (`CarouselAlign`): Where a page lines up in the viewport.
- `slidesPerPage?` (`CarouselSlidesPerPage`): How many slides one page holds: Next moves this many, and each indicator stands for this many. `"auto"` fits as many as the viewport shows.
- `loop?` (`boolean`): Whether the slides go round: Next on the last page goes to the first, which comes in after the last, and a swipe back from the first page reaches the last. With fewer than a page of slides to either side, Next on the last page scrolls back to the first instead.
- `skipSnaps?` (`boolean`): Whether a fast swipe can pass over pages. Without it, one swipe moves one page.
- `dragFree?` (`boolean`): Whether swipes and drags coast to wherever they stop instead of a page. The nearest page becomes the current one.
- `drag?` (`boolean`): Whether swiping, dragging and scrolling move the slides. Without it, only the parts, keys and controllers do.
- `controller?` (`object`): Pages the carousel from anywhere. Create one with `createCarouselController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### CarouselViewport

The scrolling area. Renders a `div` that scrolls and snaps natively, and takes focus for the arrow keys.

### CarouselContent

Holds the slides. Renders a `div` that announces slides coming into view, except while rotating.

### CarouselItem

One slide. Renders a `div` with the group role, named by its position, like "2 of 5".

### CarouselPrevious

- `controller?` (`object`): The carousel this part drives when it isn't inside one, like buttons in a page header.

### CarouselNext

Shows the next page. Takes the same props as `CarouselPrevious`.

### CarouselIndicatorGroup

Groups the indicators. Renders a `div` with the tablist role. Takes the same props as `CarouselPrevious`.

### CarouselIndicator

- `page?` (`number`): The page it shows and selects, from 1. Inferred from the indicators' order when left out.

### CarouselPlayToggle

Starts and stops rotation. Renders a `button`. Takes the same props as `CarouselPrevious`.

### State

What render functions, state-based class names and slots receive, per part.

`Carousel`:

- `page` (`number`): The current page, from 1.
- `pageCount` (`number | null`): How many pages there are, or null before the slides are measured, like on the server.
- `playing` (`boolean`): Whether it rotates on its own.
- `orientation` (`CarouselOrientation`): Which way the slides scroll.

`CarouselViewport`:

- `orientation` (`CarouselOrientation`): Which way the slides scroll.
- `dragging` (`boolean`): Whether a mouse or pen is dragging the slides.

`CarouselContent`:

- `orientation` (`CarouselOrientation`): Which way the slides scroll.

`CarouselItem`:

- `index` (`number`): The slide's position among the slides, from 0. -1 until it's measured.
- `active` (`boolean`): Whether the slide belongs to the current page.
- `inView` (`boolean`): Whether at least half of the slide shows. Slides out of view are inert.

`CarouselPrevious` and `CarouselNext`:

- `disabled` (`boolean`): Whether there's no page that way, so pressing does nothing. It stays focusable.

`CarouselIndicatorGroup`:

- `page` (`number`): The current page, from 1.
- `pageCount` (`number | null`): How many pages there are, or null before the slides are measured.

`CarouselIndicator`:

- `page` (`number`): The page it stands for, from 1, or 0 before it's known.
- `selected` (`boolean`): Whether its page is the current one.

`CarouselPlayToggle`:

- `playing` (`boolean`): Whether it rotates on its own.
- `paused` (`boolean`): Whether rotation is paused for now: hovered, the tab hidden, scrolled out of view or held.

### Reasons

`details.reason` says why the page changed.

- `previous-press` (`MouseEvent | KeyboardEvent`): A pagination's or a carousel's Previous part was pressed.
- `next-press` (`MouseEvent | KeyboardEvent`): A pagination's or a carousel's Next part was pressed.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.
- `scroll` (`Event | undefined`): The user scrolled a carousel some other way: a wheel, a trackpad, a scrollbar, or the browser bringing focus or a find in page into view.
- `timeout` (`none`): A duration ran out, like a toast's, or a rotating carousel's interval.
- `content-resize` (`none`): The content or the screen changed size, and the drawer's snap point or the carousel's page went away, so it moved to the nearest one.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

And why rotation started or stopped.

- `previous-press` (`MouseEvent | KeyboardEvent`): A pagination's or a carousel's Previous part was pressed.
- `next-press` (`MouseEvent | KeyboardEvent`): A pagination's or a carousel's Next part was pressed.
- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `swipe` (`TouchEvent | PointerEvent`): A swipe gesture: a finger, mouse or pen dragged it.
- `scroll` (`Event | undefined`): The user scrolled a carousel some other way: a wheel, a trackpad, a scrollbar, or the browser bringing focus or a find in page into view.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.
- `toggle-press` (`MouseEvent | KeyboardEvent`): A toggle was pressed: a password input's, which shows or hides the password, or a carousel's, which starts or stops rotation.
- `focus-in` (`FocusEvent`): Keyboard focus moved into the component, which stops a rotating carousel, as the carousel pattern asks, or onto a canvas item, which brought it into view, or onto a calendar's day another way, like a screen reader's.

### Controller

Create one with `createCarouselController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, passed to the change callback, and returns `false` when the change is canceled or there's nowhere to go.

- `getPage()` (`() => number`): The current page, from 1.
- `getPageCount()` (`() => number | null`): How many pages there are, or null before the carousel has measured its slides.
- `setPage(page, options?)` (`(page: number, options?: CarouselPageOptions | undefined) => boolean`): Goes to a page, from 1, clamped to the pages there are. Returns false when canceled or already there.
- `next(options?)` (`(options?: CarouselPageOptions | undefined) => boolean`): Goes to the next page, or the first one after the last with `loop`. Returns false at the end.
- `previous(options?)` (`(options?: CarouselPageOptions | undefined) => boolean`): Goes to the previous page, or the last one before the first with `loop`. Returns false at the start.
- `canNext()` (`() => boolean`): Whether there's a next page, always with `loop`.
- `canPrevious()` (`() => boolean`): Whether there's a previous page, always with `loop`.
- `getProgress()` (`() => number`): How far the slides have scrolled, from 0 at the first page to 1 at the last, or round the loop. Also `--carousel-progress` on the root.
- `isPlaying()` (`() => boolean`): Whether it rotates on its own.
- `setPlaying(playing, options?)` (`(playing: boolean, options?: CarouselPlayingOptions | undefined) => boolean`): Starts or stops rotation. Returns false when canceled or unchanged.
- `play(options?)` (`(options?: CarouselPlayingOptions | undefined) => boolean`): Starts rotation.
- `pause(options?)` (`(options?: CarouselPlayingOptions | undefined) => boolean`): Stops rotation.

### Events

Callbacks get the new value first, then the details.

| Prop                   | On         | Receives                                                    |
| ---------------------- | ---------- | ----------------------------------------------------------- |
| `onPageChange`         | `Carousel` | `(page, details)`: the new page, and the [reason](#reasons) |
| `onPageChangeComplete` | `Carousel` | `(page)`: the page the slides came to rest on               |
| `onPlayingChange`      | `Carousel` | `(playing, details)`: whether it rotates, and the reason    |

## Accessibility

It follows the [WAI-ARIA carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/): a region described as a carousel, slides as groups described as slides and labelled by position, Previous and Next that control the slides, a rotation control, and indicators as a tablist. Every line below is an automated test.

Each slide is labelled by its position, like "1 of 5", unless it has an `aria-label` of its own, which is also how you translate it. Slides less than half in view are `inert` and hidden from screen readers, so Tab and the virtual cursor only reach what shows.

### Keyboard

Arrow keys follow the orientation, and swap left and right in right-to-left text.

| Key                                       | Does                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Tab                                       | Reaches the play toggle, links and controls in slides in view, Previous, Next and the current indicator |
| ArrowRight, ArrowLeft                     | In the viewport, the next and previous page. ArrowDown and ArrowUp when vertical                        |
| Home, End                                 | In the viewport or the indicators, the first and last page                                              |
| ArrowRight, ArrowLeft, ArrowDown, ArrowUp | In the indicators, the next and previous indicator, which shows its page                                |
| Enter, Space                              | Presses Previous, Next, an indicator or the play toggle                                                 |

Fields and widgets inside slides keep their arrow keys: a text field's caret moves, and the carousel stays put. When arrow keys page away from a slide that has focus, focus moves to the slide that comes in, so it never stays on something out of view. Previous and Next stay focusable at the ends, with `aria-disabled`, so focus never drops to the page when Next reaches the last slide.

### Tested Behavior

**Structure**

- The carousel is a named region described as a carousel.
- Each slide is a group described as a slide.
- The first slide shows first.

**Previous and next**

- Next shows the next slide.
- Previous shows the previous slide.
- Previous is disabled on the first slide and Next on the last.
- Next on the last slide does nothing.
- Next and Previous are buttons that don't submit a form.

**Keyboard**

- ArrowRight in a slide shows the next slide, and ArrowLeft the previous.
- ArrowLeft on the first slide stays there.

**Pages**

- With three slides to a view, Next moves one slide, and the last page shows the last three.
- Three slides to a page move three at a time.
- Auto pages fit as many slides as show.
- It can start on another page.
- A controller pages it from outside.

**Rest**

- It reports the page once the slides come to rest.

**Loop**

- Next on the last slide shows the first.
- Previous on the first slide shows the last.
- Previous and Next are never disabled.
- Next on the last slide carries on the same way to the first.
- Pressing Next quickly keeps going forward, round past the last slide.
- A mouse drag back from the first slide shows the last.
- With three slides to a view, the last slide shows before the first.
- A vertical carousel drags down from the first slide to the last.

**Dragging**

- Dragging the slides with a mouse shows the next one.
- A short, slow drag settles back on the same slide.
- Dragging back shows the previous slide.
- A drag that starts on a link doesn't follow it.
- Without dragging, a drag moves nothing.

**More**

- A vertical carousel drags up and down.
- Pressing keys with no waits lands on the right slide.
- A fast flick moves one page, not more.
- The current slide stays in view when the slides change size.

Runs in React, Vue and web components.

Beyond the baseline:

**Focus**

- Next keeps focus when it reaches the last slide.
- Tab reaches only the slides in view.
- Slides out of view are hidden from assistive technology.
- Arrow keys bring the next slide in and move focus to it.
- A text field in a slide keeps its arrow keys.
- Home and End go to the first and last slide.

**Orientation**

- A vertical carousel pages with ArrowDown and ArrowUp.

**Indicators**

- Indicators are a tablist with the current page selected.
- Pressing an indicator shows its page.
- Arrow keys move between indicators and show their page.
- The indicators are one tab stop, on the current page.
- An indicator controls the slides of its page.
- Indicators past the page count hide themselves.

**Changes**

- A change can be canceled.
- A canceled drag springs back.
- Every change says why.
- A horizontal wheel scrolls to the next slide.
- With loop, a wheel back from the first slide scrolls natively to the last.
- --carousel-progress on the root follows the slides, for progress bars in CSS.
- With loop, --carousel-progress goes round, whatever the track's rotation.
- Next outside the carousel works through its controller.

**Rotation**

- It rotates on its own, past the last slide to the first.
- The play toggle stops and starts rotation, and its name says which.
- Keyboard focus moving in stops rotation, as the pattern asks.
- Hovering pauses rotation, and leaving resumes it.
- Pressing Next stops rotation.
- The slides are a live region only while not rotating.
- It doesn't start rotating when the user prefers reduced motion.
- Reduced motion pages without animating.

**Pages**

- Indicators follow a change in size.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while using the carousel with a keyboard.

Runs in React, Vue and web components.
