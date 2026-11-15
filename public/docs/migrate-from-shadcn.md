# Coming from shadcn/ui

UISet installs with the same CLI into the same folder, and its base skin adopts your
shadcn theme. What changes is underneath: components are UI SDK's, so keyboard, focus,
screen reader and agent behavior come built in, and the API follows UI SDK's.

## Moving an app over

1. **Commit first.** UISet items have the same file names as shadcn's
   (`components/ui/button.tsx`), and the CLI asks before it overwrites one.
2. **Add the root** and wrap the app. Your theme variables are picked up as they are:

   ```bash
   npx shadcn@latest add superzero11/uiset/uiset
   ```

   ```tsx
   <UISet skin="base">
     <App />
   </UISet>
   ```

3. **Replace components one at a time**, starting with leaves (button, badge, input) and
   then the composite ones (dialog, select, menu). Each item is independent, so the app
   keeps working between steps.
4. **Run your tests.** Selectors by role and name keep working; selectors on Radix's
   `data-state` need the UI SDK attributes below.

## What maps to what

| shadcn/ui            | UISet item        | Notes                                                                 |
| -------------------- | ----------------- | --------------------------------------------------------------------- |
| Button               | `button`          | `variant`: `solid` (default), `outline`, `ghost`                      |
| Input, Label, Form   | `field`           | `Field`, `FieldLabel`, `Input`, `FieldDescription`, `FieldError`; native forms, no form library needed |
| Select               | `select`          | `SelectTrigger` shows the chosen value by itself; `SelectLabel` names it |
| DropdownMenu         | `menu`            | `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`; handle `onAction` on the menu |
| Dialog               | `dialog`          | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogClose`; no Header or Footer parts, use your own markup |
| AlertDialog          | `alert-dialog`    | Same parts with an `AlertDialog` prefix                               |
| Sheet                | `drawer`          | `Drawer`, with snap points and a handle                               |
| Popover, Tooltip, HoverCard | `popover`, `tooltip`, `hover-card` | Same idea, UI SDK's parts            |
| Tabs                 | `tabs`            | `TabsTab` for TabsTrigger, `TabsPanel` for TabsContent                |
| Accordion            | `accordion`       | `AccordionItem`, `AccordionTrigger`, `AccordionPanel` for AccordionContent |
| Command              | `command`         | `CommandInput`, `CommandList`, `CommandItem`, `CommandEmpty`          |
| Toast (Sonner)       | `toast`           | `toast("Saved", { description })`, with a `ToastRegion` in the app    |
| Checkbox, Switch, Slider, RadioGroup | `checkbox`, `switch`, `slider`, `radio` | Same use; Slider takes a number or an array |
| Calendar, DatePicker | `calendar`, `date-picker` | Plus `date-input` and `time-input` for typed dates            |
| Table, DataTable     | `data-grid`       | Sorting, filters, grouping, pinning, editing and virtual rows built in |
| Card, Badge, Alert, Skeleton, Breadcrumb | `card`, `badge`, `alert`, `skeleton`, `breadcrumbs` | See [App frame and data display](./app-shell.md) |
| Sidebar              | `app-shell`       | A sidebar that collapses to icons and becomes a drawer on phones      |
| Chart (Recharts)     | `line-chart`, `bar-chart`, … | No chart library: keyboard-explorable, with a table view    |

Things shadcn/ui doesn't have: the [chat kit](./chat.md), a
[rich text editor](./rich-text.md), [board](./board.md), [scheduler](./scheduler.md),
[canvas](./canvas.md), [IDE](./ide.md), [terminal](./terminal.md), the
[Agent Console](./agent-console.md) and whole-page [templates](./templates.md).

## API differences

- **`asChild` becomes `render`.** `<Button asChild><a href="/">Home</a></Button>` is
  `<Button render={<a href="/" />}>Home</Button>`.
- **State attributes.** Radix's `data-state="open"` and `data-state="checked"` are
  `data-open` and `data-checked` (also `data-pressed`, `data-highlighted`,
  `data-disabled`). Every part has a `data-slot`, like `data-slot="dialog-content"`.
- **Change handlers** are `onValueChange`, `onOpenChange`, `onCheckedChange` and
  `onPressedChange`, with a second `details` argument that says why it changed (a click,
  a key, an agent) and can cancel it.
- **Styling.** UISet ships plain CSS in cascade layers, not Tailwind classes. Tailwind
  keeps working beside it: put a class on any part, and since your utilities aren't in
  UISet's layers, they win.
- **Names for agents.** UI SDK's agent bridge finds controls by their accessible names.
  A control with a visible label is already named; an icon button needs `aria-label`.

## Theme

Nothing to change: the base skin reads `--background`, `--foreground`, `--muted`,
`--muted-foreground`, `--border`, `--input`, `--primary` and `--radius`. To set the
accent without a shadcn theme, pass `keyColor`, or try one in the
[theme generator](https://uiset.dev/themes/generator), which also exports shadcn/ui variables. See [Theming](./theming.md).
