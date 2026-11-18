<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.10, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props.

### ScrollArea

- `type?` (`ScrollAreaType`): When the scrollbars show: "auto" whenever the content overflows, "always" even when it doesn't, "scroll" while scrolling, and "hover" while scrolling or while the pointer is over the scroll area. Each scrollbar has `data-visible` while it should show; style that.
- `scrollHideDelay?` (`number`): How long scrollbars stay after they stop being needed, in ms, with "scroll" and "hover".
- `stickToEnd?` (`boolean`): Keeps the end in view while the content grows, like a chat or streamed output: it starts at the bottom and stays there. Scrolling toward the top lets go, and scrolling back to the bottom sticks again.
- `controller?` (`{ scrollToEnd: (options?: ScrollAreaScrollOptions) => void; scrollToStart: (options?: ScrollAreaScrollOptions) => void; isAtEnd: () => boolean; isAtStart: () => boolean; isSticking: () => boolean; }`): Drives it from anywhere. Create one with `createScrollAreaController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### ScrollAreaScrollbar

- `orientation?` (`"horizontal" | "vertical"`): The axis the scrollbar scrolls.

### ScrollAreaViewport, ScrollAreaContent, ScrollAreaThumb, ScrollAreaCorner and ScrollAreaScrollToEnd

These take no options of their own, only the props of the element they render. A thumb follows the orientation of its scrollbar.

### State

What render functions, state-based class names and slots receive. The root, the viewport and the content receive the scroll area's state.

- `overflowX` (`boolean`): Whether the content is wider than the viewport.
- `overflowY` (`boolean`): Whether the content is taller than the viewport.
- `atStart` (`boolean`): Whether the view is at the start of the scroll area: the top, or the inline start when only the horizontal axis overflows.
- `atEnd` (`boolean`): Whether the view is at the end of the scroll area: the bottom, or the inline end when only the horizontal axis overflows.
- `scrolling` (`boolean`): Whether the user is scrolling now.
- `hovering` (`boolean`): Whether a mouse or pen is over the scroll area.
- `sticking` (`boolean`): Whether the view follows the end as the content grows, with `stickToEnd`.

`ScrollAreaScrollbar`:

- `orientation` (`"vertical" | "horizontal"`): The axis it scrolls.
- `visible` (`boolean`): Whether it should show now, by `type`.
- `scrolling` (`boolean`): Whether its axis is scrolling now.
- `hovering` (`boolean`): Whether a mouse or pen is over the scroll area.
- `dragging` (`boolean`): Whether its thumb is being dragged.

`ScrollAreaThumb`:

- `orientation` (`"vertical" | "horizontal"`): The axis it scrolls.
- `dragging` (`boolean`): Whether it's being dragged.

`ScrollAreaScrollToEnd`:

- `visible` (`boolean`): Whether it should show: the view is away from the end and isn't heading there.

### Controller

Create one with `createScrollAreaController()` and pass it as `controller`.

- `scrollToEnd(options?)` (`(options?: ScrollAreaScrollOptions | undefined) => void`): Scrolls to the end: the bottom, or the inline end when only the horizontal axis overflows. With `stickToEnd`, it sticks to the end again.
- `scrollToStart(options?)` (`(options?: ScrollAreaScrollOptions | undefined) => void`): Scrolls to the start: the top, or the inline start when only the horizontal axis overflows.
- `isAtEnd()` (`() => boolean`): Whether the view is at the end now, even in a scroll event, before the attributes catch up.
- `isAtStart()` (`() => boolean`): Whether the view is at the start now, even in a scroll event, before the attributes catch up.
- `isSticking()` (`() => boolean`): Whether the view follows the end as the content grows, with `stickToEnd`.

`scrollToEnd` and `scrollToStart` take an optional `{ behavior }`:

- `behavior?` (`"instant" | "smooth"`): "smooth" eases there, following content that keeps growing. It's instant when the user prefers reduced motion.

## Accessibility

No WAI-ARIA pattern covers scroll areas: the viewport is a native scroller, and keyboard access follows axe's [scrollable-region-focusable](https://dequeuniversity.com/rules/axe/4.10/scrollable-region-focusable) rule. Scrollbars and the corner are hidden from screen readers, which scroll the viewport themselves. Make the viewport a landmark with `role="region"` and an `aria-label` when it's worth finding, or give a chat `role="log"`.

### Keyboard

The viewport scrolls natively, so arrow keys, Page Up and Down, Home, End and Space work once focus is inside it. A viewport that scrolls and holds nothing focusable is a tab stop itself, so keyboard users can reach it; one with links or fields inside isn't, since Tab reaches them and they scroll it.

### Tested Behavior

Every line below is an automated test.

**Thumb**

- The wheel scrolls the viewport and moves the thumb.
- The thumb is as long as the visible share of the content.
- At the end of the content, the thumb is at the end of its track.
- Dragging the thumb scrolls the content as far along.
- Dragging the thumb past the track's end stops at the end.
- Dragging the thumb selects no text.
- The horizontal thumb follows horizontal scrolling.
- The thumb shrinks as the content grows.
- An image loading late resizes the thumb.

**Track**

- Pressing the track after the thumb scrolls toward the press.
- Pressing the track before the thumb scrolls back toward the press.
- Holding the track keeps paging until the thumb reaches the pointer.
- Alt with a press on the track jumps there.
- Pressing a scrollbar leaves focus where it was.
- A wheel over a scrollbar scrolls the viewport, not the page.
- A wheel over a scrollbar at the end scrolls the page.

**Overflow**

- Custom scrollbars hide the native ones.
- The root says while the user scrolls, and stops after.
- Content that fits shows no scrollbar.
- Content that overflows both ways shows both scrollbars and the corner between them.

**Keyboard**

- A viewport that scrolls and holds nothing focusable is a tab stop.
- Keys scroll a focused viewport natively.
- A viewport that doesn't scroll is no tab stop.
- Focusing content scrolls it into view.

**Web components**

- A scrollbar whose orientation changes sizes its thumb along the new axis. Web components only.

Runs in React, Vue and web components.

Beyond the baseline:

- A scroll area in another document times its scrollbars with that document's window. Web components only.

**Track**

- Pressing the track pages by most of a viewport, like a native scrollbar.
- Escape during a thumb drag puts the content back.

**Keyboard**

- A viewport with focusable content is no tab stop: Tab goes to the content.

**Native scrollbars**

- Without custom scrollbars, the native ones stay.
- Hiding native scrollbars injects no style element.

**State**

- The root says which axes overflow and which edges the view is at.
- CSS variables say how far the content reaches past each edge, and the progress.
- The variables don't inherit, and a child of the root takes them with inherit.

**Scrollbar types**

- Hover shows the scrollbar while the pointer is over the area, then hides it after the delay.
- Scroll shows the scrollbar only while scrolling, not on hover.
- Scroll shows only the scrollbar of the axis that scrolls.
- Auto shows the scrollbar whenever the content overflows.
- Always shows the scrollbar even when the content fits.
- A hidden scrollbar lets presses through to the content under it.

**Sticking to the end**

- It starts at the end.
- New messages, streamed words and late images keep the end in view.
- A wheel toward the start lets go, and growth no longer moves the view.
- Content streaming in during a wheel toward the start doesn't pull the view back.
- PageUp in the viewport lets go.
- A wheel toward the start inside a scroller in the content keeps following.
- A key a widget inside uses keeps following.
- The controller reads where the view is from a scroll listener. Web components only.
- A scroll toward the start from the app or find in page lets go too.
- Scrolling back to the end follows again.
- Dragging the thumb toward the start lets go, and back to the end follows.
- Keeping the end in view never scrolls the page.
- Keeping the end in view doesn't flash the scrollbars as scrolling.
- A smooth scroll-behavior doesn't slow down keeping the end in view.
- Text selection in progress isn't pulled away by growth.

**Jump to latest**

- It's out of reach at the end, and shows once the view moves away.
- It scrolls to the end, follows the end again, and hides at once.
- From the keyboard, focus moves to the viewport instead of the page.
- With reduced motion, it jumps at once.

**Hidden scrollbars**

- A scrollbar shows its thumb as soon as it's hovered.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Reading a scroll area announces its region and content, and no scrollbar.

Runs in React, Vue and web components.
