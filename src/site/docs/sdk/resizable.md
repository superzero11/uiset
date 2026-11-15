<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Resizable

- `layout?` (`number[]`): Each panel's size in percent, in panel order, like `[25, 75]`. Pass it to control the group.
- `defaultLayout?` (`number[]`): The layout at first, when uncontrolled. Panels' own `defaultSize` is what a server renders, so prefer that with server rendering.
- `onLayoutChange?` (`((layout: number[], details: ResizableLayoutChangeDetails) => void)`): Runs while the layout changes: on every frame of a drag and every key. `details.cancel()` keeps the layout.
- `onLayoutCommit?` (`((layout: number[], details: ResizableLayoutCommitDetails) => void)`): Runs once an interaction that changed the layout ends: the pointer lifts, the key comes up, or a panel collapses. For saving.
- `orientation?` (`"horizontal" | "vertical"`): The direction panels are laid out in. Horizontal panels sit side by side, vertical ones stack.
- `disabled?` (`boolean`): Stops every handle: no drags, no keys, and handles leave the tab order.
- `step?` (`number`): How far an arrow key moves a handle, in percent.
- `largeStep?` (`number`): How far Shift with an arrow key moves a handle, in percent.
- `autoSaveId?` (`string`): Saves the layout when an interaction completes and restores it on the next visit, under this key. Give panels an `id` so it survives changes elsewhere on the page.
- `storage?` (`ResizableStorage`): Where `autoSaveId` saves: anything with `getItem` and `setItem`, like a cookie store a server can read.
- `controller?` (`object`): Resizes the group from anywhere. Create one with `createResizableController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### ResizablePanel

- `id?` (`string`): Identifies the panel for the controller, `aria-controls` and saved layouts. It's the element's id. Generated when left out.
- `defaultSize?` (`ResizableSize`): Where the panel starts, in percent or with a unit, like `30` or `"240px"`. Without one, panels share what's left evenly. A server renders this size.
- `minSize?` (`ResizableSize`): The smallest the panel gets while open.
- `maxSize?` (`ResizableSize`): The largest the panel gets.
- `collapsible?` (`boolean`): Lets the panel collapse below its minimum to `collapsedSize`: by dragging past half the way there, with Enter or a double-click on its handle, or through the controller.
- `collapsedSize?` (`ResizableSize`): The size a collapsible panel collapses to. At 0, its content leaves the tab order and the accessibility tree.

### ResizableHandle

- `disabled?` (`boolean`): Stops this handle: no drags and no keys, and it leaves the tab order.

### State

What render functions, state-based class names and slots receive.

- `orientation` (`"horizontal" | "vertical"`): The direction panels are laid out in.
- `disabled` (`boolean`): Whether the group is disabled.
- `dragging` (`boolean`): Whether a handle is being dragged.
- `layout` (`number[]`): Each panel's size in percent. Reading it renders on every frame of a drag.

Panels:

- `orientation` (`"horizontal" | "vertical"`): The direction panels are laid out in.
- `size` (`number`): The panel's size in percent. Reading it renders on every frame of a drag.
- `collapsed` (`boolean`): Whether the panel is down at its `collapsedSize`, below its minimum.
- `collapsible` (`boolean`): Whether the panel can collapse.

Handles:

- `orientation` (`"horizontal" | "vertical"`): The direction panels are laid out in. The separator itself runs across it.
- `disabled` (`boolean`): Whether the handle can't move.
- `dragging` (`boolean`): Whether the handle is being dragged.
- `hovering` (`boolean`): Whether the pointer is over the handle or within its hit area.

### Reasons

`details.reason` says why the layout changed.

- `drag` (`PointerEvent`): A slider thumb or a resize handle was dragged, or an item was dragged to a new place in a list.
- `step-key` (`KeyboardEvent`): Arrow, Page Up, Page Down, Home or End stepped a slider or a number input.
- `collapse` (`MouseEvent | KeyboardEvent`): Enter or a double-click on a resize handle collapsed the panel beside it, or restored it.
- `resize` (`none`): The group changed size, so panels with sizes in pixels moved to stay within their bounds.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createResizableController()` and pass it as `controller`.

Write methods take an optional `{ reason, event }`, run the change callback like a drag, and return `false` when nothing changed or the change was canceled.

- `getLayout()` (`() => number[]`): Each panel's size in percent, in order.
- `setLayout(layout, options?)` (`(layout: number[], options?: ResizableChangeOptions | undefined) => boolean`): Sets every panel's size at once, in percent. It's fitted to the panels' bounds and adds up to 100. Returns whether anything changed.
- `collapse(panel, options?)` (`(panel: string | number, options?: ResizableChangeOptions | undefined) => boolean`): Collapses a collapsible panel, by its id or its index. Returns whether it collapsed.
- `expand(panel, options?)` (`(panel: string | number, options?: ResizableChangeOptions | undefined) => boolean`): Expands a collapsed panel to the size it had before it collapsed, or its minimum. Returns whether it expanded.
- `resize(panel, size, options?)` (`(panel: string | number, size: ResizableSize, options?: ResizableChangeOptions | undefined) => boolean`): Resizes one panel, by its id or its index, like `resize("sidebar", "240px")`. Its neighbours give or take the difference.
- `isCollapsed(panel)` (`(panel: string | number) => boolean`): Whether a panel is collapsed.

### Events

Callbacks get the new layout first, then the details.

| Prop             | On          | Receives                                                       |
| ---------------- | ----------- | -------------------------------------------------------------- |
| `onLayoutChange` | `Resizable` | `(layout, details)`: the new layout and the [reason](#reasons) |
| `onLayoutCommit` | `Resizable` | `(layout, details)`: the layout once the interaction ends      |

## Accessibility

Handles follow the [WAI-ARIA window splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/). Each is a focusable `separator` whose `aria-valuenow` is the size of the panel before it, with `aria-valuemin` and `aria-valuemax` as far as the panels allow, `aria-controls` pointing at that panel, and `aria-orientation` running across the group. Name each handle with `aria-label`.

### Keyboard

Focus a handle and press the arrow keys along the group's axis to move it by `step`, or with Shift by `largeStep`. Home and End move it as far as the panels allow, and Enter collapses or restores a collapsible panel beside it. A panel at its minimum passes the rest of a move on to the next one. Disabled handles leave the tab order.

### Tested Behavior

Every line below is an automated test.

**Keyboard**

- Starts at each panel's default size, and panels without one share the rest.
- ArrowRight grows the panel before the handle by one step, and ArrowLeft shrinks it.
- Shift with an arrow key moves by the large step.
- Arrows across the group's axis do nothing.
- ArrowDown and ArrowUp move a vertical group's handle.
- Home collapses a collapsible panel, and End grows it to its maximum.
- Home stops at the minimum of a panel that can't collapse.
- Enter collapses the panel before the handle, and restores its size.
- Enter collapses the panel after the handle when only that one can collapse.
- One step past a collapsible panel's minimum collapses it.
- A panel at its minimum passes the rest on to the next one.
- End stops where the panels' bounds meet.
- Keys pressed without waiting all land.
- Keys complete the change once they come up.
- Step and large step set how far keys move.
- A canceled change keeps the layout.
- A controlled group follows its layout.
- A controlled group that ignores a change completes nothing. React and Vue only.
- A disabled handle stops a move from the next one, so the panels past it keep their sizes.
- DefaultLayout sets where the panels start.
- A disabled group's handles leave the tab order and ignore drags.

**Pointer**

- Dragging a handle moves it with the pointer.
- A drag reports its moves with the drag reason and completes once.
- Dragging past a disabled handle moves nothing beyond it.
- Dragging a vertical group's handle moves it up and down.
- Dragging past half a collapsible panel's minimum collapses it, and back opens it.
- A drag stops at the panels' bounds.
- A double-click on a handle collapses its panel, and another restores it.
- A press just beside the thin handle drags it.
- A press farther from the handle doesn't drag.
- Where two handles meet, one drag moves both.
- A drag shows the axis cursor over the whole page until it ends.

**Controller**

- Collapses and expands a panel, with the imperative reason.
- Resizes a panel to a size in pixels.

**Container**

- A panel with a minimum in pixels keeps it as the group shrinks.
- Panels keep their share as the group grows.

**Pages around a group**

- A layer above a handle keeps its presses.
- A press beside a handle doesn't click what's under it.
- Only the main button drags.
- An iframe under the pointer doesn't stop a drag.
- At a limit, the cursor points the only way a handle can go.
- A saved layout is there on the first paint.

Runs in React, Vue and web components.
