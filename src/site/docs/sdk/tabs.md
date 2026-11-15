<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.2, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props and callbacks are the same as below, as React props.

### Tabs

- `value?` (`T | null`): The selected tab's value. Pass it to control the tabs. `null` selects nothing.
- `defaultValue?` (`T | null`): The tab selected at first, when uncontrolled. Defaults to the first enabled tab, which never calls `onValueChange`.
- `onValueChange?` (`((value: T | null, details: ChangeDetails<TabsValueChangeReason>) => void)`): Runs when the selection wants to change. `details.reason` says why, and `details.cancel()` stops it.
- `orientation?` (`TabsOrientation`): Which arrow keys move between tabs: left and right, or up and down.
- `activation?` (`"automatic" | "manual"`): `"automatic"` selects a tab as soon as arrow keys focus it. `"manual"` waits for Enter or Space.
- `loop?` (`boolean`): Whether arrow keys wrap from the last tab to the first.
- `hiddenUntilFound?` (`boolean`): Keeps hidden panels in the page as `hidden="until-found"`, so the browser's find in page can match their text and select their tab. Implies `keepMounted`.
- `controller?` (`{ getValue: () => T | null; setValue: (value: T | null, options?: TabsChangeOptions) => boolean; select: (value: T, options?: TabsChangeOptions) => boolean; focus: () => void; }`): Selects tabs from anywhere. Create one with `createTabsController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### TabsList

The list takes no options of its own, only the props of the element it renders.

### TabsTab

- `value` (`string`): Identifies the tab and pairs it with the panel of the same value.
- `disabled?` (`boolean`): Keeps the tab focusable but stops it from being selected, as the tabs pattern asks.

### TabsTabIcon

- `mirror?` (`boolean`): Flips the icon horizontally in right-to-left text, for icons that point a way, like arrows and chevrons. Icons that picture a thing, like a clock or a check, stay as they are.

### TabsIndicator

The indicator takes no props of its own. Its [CSS variables](#styling-tabsindicator) hold the selected tab's box.

### TabsPanel

- `value` (`string`): The value of the tab this panel belongs to.
- `keepMounted?` (`boolean`): Whether the panel stays in the page, hidden, while its tab isn't selected.
- `hiddenUntilFound?` (`boolean`): Whether the panel stays findable with `hidden="until-found"` while its tab isn't selected. Overrides the tabs'.

### State

What render functions, state-based class names and slots receive, per part.

`Tabs`:

- `value` (`T | null`): The selected tab's value.
- `orientation` (`TabsOrientation`): The tabs' `orientation` option, or `"horizontal"` when it's unset or invalid.
- `direction` (`Direction`): Which way the last selection moved.

`TabsList`:

- `orientation` (`TabsOrientation`): The tabs' `orientation` option, or `"horizontal"` when it's unset or invalid.

`TabsTab`:

- `selected` (`boolean`): Whether this tab's value is the tabs' `value`.
- `disabled` (`boolean`): Whether this tab can't be selected.

`TabsTabIcon`:

- `mirror` (`boolean`): Whether it flips in right-to-left text.

`TabsPanel`:

- `selected` (`boolean`): Whether this panel's tab is selected. False while it animates out.

`TabsIndicator`:

- `orientation` (`TabsOrientation`): The tabs' `orientation` option, or `"horizontal"` when it's unset or invalid.
- `direction` (`Direction`): Which way the last selection moved.

### Reasons

`details.reason` says why the selection changed.

- `item-press` (`MouseEvent | KeyboardEvent`): A member of a collection was chosen: a menu item, a tab, a radio or a checkbox item.
- `list-navigation` (`KeyboardEvent`): Arrow, Home or End keys moved the selection, typing picked an item, or Ctrl or ⌘ with A selected every item of a listbox.
- `find-in-page` (`Event`): The browser's find in page matched hidden content.
- `item-removed` (`none`): The selected item left the page, and another was picked.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

### Controller

Create one with `createTabsController()` and pass it as `controller`.

Every write method takes an optional `{ reason, event }`, runs `onValueChange` like a press, and returns `false` when the change is canceled.

- `getValue()` (`() => T | null`): The selected tab's value, or null when nothing is selected.
- `setValue(value, options?)` (`(value: T | null, options?: TabsChangeOptions | undefined) => boolean`): Selects a tab, or nothing with `null`. Disabled tabs never select. Returns false when canceled.
- `select(value, options?)` (`(value: T, options?: TabsChangeOptions | undefined) => boolean`): Selects a tab, the same as `setValue`.
- `focus()` (`() => void`): Moves focus to the selected tab, or the tab that holds the tab stop.

### Events

Callbacks get the new value first, then the details. `onValueChange` never runs on mount.

| Prop            | On     | Receives                                                      |
| --------------- | ------ | ------------------------------------------------------------- |
| `onValueChange` | `Tabs` | `(value, details)`: the new value, and the [reason](#reasons) |

## Accessibility

Tabs follow the [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). The list is a `tablist`, each tab controls its panel, and each panel is labelled by its tab.

### Keyboard

Tab enters the list at the selected tab and leaves it on the next Tab. Left and Right Arrow move between tabs and select them, or only move focus with `activation="manual"`, where Enter or Space selects. Up and Down Arrow do the same in a vertical list. Home and End move to the first and last tabs. The list reads `dir="rtl"` from the page or any ancestor, and Left and Right follow the reading direction, with no provider.

### Tested Behavior

Every line below is an automated test.

**Selection**

- The default tab is selected and shows its panel.
- Clicking a tab selects it and shows its panel.
- Clicking a disabled tab does nothing.
- Clicking the selected tab keeps it selected.
- A change can be cancelled.
- Without a default value, the first enabled tab is selected.
- Without a default value, the first render already selects the first enabled tab.

**Keyboard navigation**

- Tab moves focus to the selected tab.
- ArrowRight and ArrowLeft move focus and select the tab.
- Disabled tabs are focusable but never selected.
- Focus wraps at both ends.
- Home and End move to the first and last tabs.
- ArrowUp and ArrowDown do nothing in a horizontal tab list.
- Arrow keys with a modifier are left to the browser.
- Keys pressed in quick succession are never lost.
- Tab moves focus from the tab list into the selected panel.
- Shift+Tab from the panel returns to the selected tab.

**Manual activation**

- Arrow keys move focus without selecting.
- Enter selects the focused tab.
- Space selects the focused tab.
- Enter on a disabled tab does nothing.

**Vertical**

- The tab list reports its orientation.
- ArrowDown and ArrowUp move between tabs.
- ArrowLeft and ArrowRight do nothing in a vertical tab list.

**Panels**

- The selected tab controls its panel, and the panel is labelled by its tab.
- With keepMounted, hidden panels stay in the page.
- With keepMounted, a class that sets display doesn't show hidden panels.

Runs in React, Vue and web components.

Beyond the pattern's baseline:

**Enhancements**

- In manual mode, re-entering the tab list focuses the selected tab.
- A panel that holds a field is not a tab stop of its own.
- A controller selects a tab from anywhere.
- An infinite exit animation still unmounts the panel.

Runs in React, Vue and web components.

Screen readers hear the same thing in each tested framework, recorded by a virtual screen reader:

- Announcements while using the tabs with a keyboard.

Runs in React, Vue and web components.
