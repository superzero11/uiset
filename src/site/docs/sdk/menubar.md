<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.9, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

### Menubar

- `orientation?` (`MenubarOrientation`): Which arrow keys move between menus: left and right, or up and down. A vertical menubar opens its menus to the side.
- `loop?` (`boolean`): Whether arrow keys wrap from the last menu to the first, between triggers and between open menus.
- `disabled?` (`boolean`): Stops every menu from opening. Triggers stay focusable with `aria-disabled`, so the menubar keeps its tab stop and stays discoverable.
- `modal?` (`"pointer" | boolean`): The `modal` setting of every menu in the menubar that doesn't set its own. `"pointer"`: an outside press only closes the open menu. `true`: also locks scroll, traps focus and makes the rest of the page inert, except the menubar. `false`: outside presses reach what they hit.
- `controller?` (`{ focus: () => void; isOpen: () => boolean; close: (options?: ChangeOptions<MenuOpenChangeReason>) => boolean; }`): Opens, closes and focuses the menubar from anywhere. Create one with `createMenubarController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

Menus, items and their icons take the props on the Menu page, like [`MenuItemIcon`](/docs/components/menu#menuitemicon).

### State

- `orientation` (`MenubarOrientation`): Which arrow keys move between menus, from the `orientation` option. A vertical menubar opens its menus to the side.
- `disabled` (`boolean`): Whether the whole menubar is disabled.
- `open` (`boolean`): Whether one of its menus is open.
- `modal` (`boolean | "pointer"`): The modal setting its menus inherit.

### Reasons

A menu that another menu in the menubar takes over closes with `submenu-switch`, one opened by pointing at its trigger opens with `trigger-hover`, and one opened with an arrow key opens with `trigger-press`. See [Menu](/docs/components/menu#reasons) for every reason.

### Controller

- `focus()` (`() => void`): Moves focus to the trigger that holds the menubar's tab stop: the one used last, or the first.
- `isOpen()` (`() => boolean`): Whether one of its menus is open.
- `close(options?)` (`(options?: ChangeOptions<MenuOpenChangeReason> | undefined) => boolean`): Closes the open menu, if any, and its submenus. Returns false when the close was canceled or it was already closed.

## Accessibility

The menubar follows the [WAI-ARIA menubar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/).

### Keyboard

Tab first lands on the first trigger, then remembers the last one used. While a menu is open, moving the pointer onto another enabled trigger opens its menu, unless the pointer is only passing over it on the way into the open menu. Pressing that trigger keeps it open. Moving to a disabled trigger closes the current menu without opening another.

| Key             | On a Trigger              | In an Open Menu                                  |
| --------------- | ------------------------- | ------------------------------------------------ |
| Left / Right    | Previous or next trigger. | Previous or next menu, or enter/leave a submenu. |
| Down            | Open at the first item.   | Next item.                                       |
| Up              | Open at the last item.    | Previous item.                                   |
| Enter / Space   | Open at the first item.   | Choose the focused item.                         |
| Home / End      | First or last trigger.    | First or last item.                              |
| A letter        | Find a trigger by name.   | Find an item by name.                            |
| Escape          | —                         | Close and return to the trigger.                 |
| Tab / Shift+Tab | Leave the bar.            | Close and leave the bar.                         |

These directions describe a horizontal bar in left-to-right text. Right-to-left text reverses the horizontal keys and submenu side; vertical bars use Up and Down between triggers.

### Tested Behavior

Every line below is an automated test.

- The menubar is named, and its triggers are menu items that open menus.
- The menubar is one tab stop, on its first trigger.
- Left and Right move between triggers, and Home goes to the first.
- Tab comes back to the trigger used last.
- ArrowDown opens a menu and focuses its first item.
- Enter opens a menu and focuses its first item.
- Space opens a menu and focuses its first item.
- Escape closes the menu and focuses its trigger.
- Escape in a menu reached with ArrowRight returns focus to its trigger.
- Tab in an open menu closes it and moves past the menubar.
- A press opens a menu, and a press on its trigger closes it.
- While a menu is open, pointing at another trigger opens its menu instead.
- Crossing another trigger on the way to the open menu keeps the menu.
- Resting on another trigger on the way to the open menu switches to it.
- While a menu is open, pointing at a disabled trigger closes it and opens nothing.
- After pointing at a disabled trigger, pointing at another trigger opens its menu.
- Pointing at a trigger while every menu is closed opens nothing.
- A press outside closes the open menu.
- Choosing an item runs it, closes the menu and focuses its trigger.
- Checkbox and radio items work in a menubar's menus.
- A disabled item in a menubar's menu is focusable and does nothing.
- With loop off, arrows stop at the ends.

**Vertical**

- Up and Down move between triggers, and Right opens a menu to the side.

Runs in React, Vue and web components.
