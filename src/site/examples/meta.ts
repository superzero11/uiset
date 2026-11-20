// The gallery's examples, as data: which example shows which registry item, in what order.
// Kept apart from the example modules so a page can find an item's example without loading
// all of them (index.ts loads them all, for the gallery).

type ExampleMeta = {
  slug: string
  title: string
  parts: string
  wide?: boolean
  // The registry items the example is about.
  items: string[]
}

const groups: [string, ExampleMeta[]][] = [
  [
    "Actions",
    [
      { slug: "button", title: "Button", parts: "Button, ConfirmButton", items: ["button"] },
      {
        slug: "toggle",
        title: "Toggle",
        parts: "Toggle, ToggleGroup",
        items: ["toggle"],
      },
      {
        slug: "toolbar",
        title: "Toolbar",
        parts: "Toolbar, ToolbarButton, ToolbarSeparator",
        items: ["toolbar"],
      },
    ],
  ],
  [
    "Inputs",
    [
      {
        slug: "field",
        title: "Field and Input",
        parts: "Field, FieldLabel, Input, FieldDescription, FieldError",
        items: ["field", "input", "label"],
      },
      { slug: "textarea", title: "Textarea", parts: "Textarea", items: ["textarea"] },
      {
        slug: "inline-edit",
        title: "Inline edit",
        parts: "InlineEdit (createInlineEdit)",
        items: ["inline-edit"],
      },
      {
        slug: "schema-form",
        title: "Schema form",
        parts: "SchemaForm, defineForm (Field, Stepper, agent fill)",
        items: ["schema-form"],
      },
      {
        slug: "number-input",
        title: "Number input",
        parts: "NumberInput, NumberInputGroup, NumberInputControl",
        items: ["number-input"],
      },
      {
        slug: "password-input",
        title: "Password input",
        parts: "PasswordInput, PasswordInputControl, PasswordInputToggle, PasswordRules",
        items: ["password-input"],
      },
      {
        slug: "otp-input",
        title: "One-time code",
        parts: "OTPInput, OTPInputGroup, OTPInputSlot",
        items: ["otp-input"],
      },
      {
        slug: "checkbox",
        title: "Checkbox",
        parts: "Checkbox, CheckboxGroup, CheckboxIndicator",
        items: ["checkbox"],
      },
      {
        slug: "radio",
        title: "Radio",
        parts: "RadioGroup, Radio, RadioCard",
        items: ["radio"],
      },
      {
        slug: "switch",
        title: "Switch",
        parts: "Switch, SwitchThumb",
        items: ["switch"],
      },
      {
        slug: "slider",
        title: "Slider",
        parts: "Slider, SliderControl, SliderTrack, SliderThumb",
        items: ["slider"],
      },
      {
        slug: "segmented-control",
        title: "Segmented control",
        parts: "SegmentedControl, SegmentedControlItem",
        items: ["segmented-control"],
      },
      { slug: "rating", title: "Rating", parts: "Rating, RatingItem", items: ["rating"] },
      {
        slug: "color-picker",
        title: "Color picker",
        parts: "ColorPicker, ColorPickerArea, ColorPickerSlider, ColorPickerInput",
        items: ["color-picker"],
      },
      {
        slug: "file-input",
        title: "File input",
        parts: "FileInput, FileInputDropzone, FileInputList, FileInputItem",
        items: ["file-input"],
      },
      {
        slug: "upload",
        title: "Upload",
        parts: "Upload, useUploadQueue (FileInput, Progress, Button, announce)",
        items: ["upload"],
      },
    ],
  ],
  [
    "Choosing",
    [
      {
        slug: "select",
        title: "Select",
        parts: "Select, SelectTrigger, SelectContent, SelectItem",
        items: ["select"],
      },
      {
        slug: "combobox",
        title: "Combobox",
        parts: "Combobox, ComboboxInput, ComboboxList, ComboboxItem",
        items: ["combobox"],
      },
      {
        slug: "autocomplete",
        title: "Autocomplete",
        parts: "Autocomplete, AutocompleteInput, AutocompleteList",
        items: ["autocomplete"],
      },
      {
        slug: "listbox",
        title: "Listbox",
        parts: "Listbox, ListboxItem, ListboxItemIndicator",
        items: ["listbox"],
      },
      {
        slug: "command",
        title: "Command",
        parts: "Command, CommandInput, CommandList, CommandItem",
        items: ["command"],
      },
      {
        slug: "token-input",
        title: "Token input",
        parts: "TokenInput, TokenInputEditor",
        items: ["token-input"],
      },
      {
        slug: "trigger-menu",
        title: "Trigger menu",
        parts: "TriggerMenu, TriggerMenuInput, TriggerMenuContent, TriggerMenuItem",
        items: ["trigger-menu"],
      },
    ],
  ],
  [
    "Dates and times",
    [
      {
        slug: "date-input",
        title: "Date input",
        parts: "DateInput, DateInputSegment",
        items: ["date-input"],
      },
      {
        slug: "time-input",
        title: "Time input",
        parts: "TimeInput, TimeInputSegment",
        items: ["time-input"],
      },
      {
        slug: "date-picker",
        title: "Date picker",
        parts: "DatePicker, DatePickerInput, DatePickerTrigger, DatePickerContent",
        items: ["date-picker"],
      },
      {
        slug: "calendar",
        title: "Calendar",
        parts: "Calendar, CalendarGrid, CalendarDay",
        items: ["calendar"],
      },
    ],
  ],
  [
    "Overlays",
    [
      {
        slug: "dialog",
        title: "Dialog",
        parts: "Dialog, DialogTrigger, DialogContent, DialogTitle",
        items: ["dialog"],
      },
      {
        slug: "alert-dialog",
        title: "Alert dialog",
        parts: "AlertDialog, AlertDialogClose",
        items: ["alert-dialog"],
      },
      {
        slug: "drawer",
        title: "Drawer",
        parts: "Drawer, DrawerTrigger, DrawerContent",
        items: ["drawer"],
      },
      {
        slug: "popover",
        title: "Popover",
        parts: "Popover, PopoverTrigger, PopoverContent",
        items: ["popover"],
      },
      {
        slug: "hover-card",
        title: "Hover card",
        parts: "HoverCard, HoverCardTrigger, HoverCardContent",
        items: ["hover-card"],
      },
      {
        slug: "tooltip",
        title: "Tooltip",
        parts: "Tooltip, TooltipTrigger, TooltipContent",
        items: ["tooltip"],
      },
      {
        slug: "menu",
        title: "Menu",
        parts: "Menu, MenuTrigger, MenuContent, MenuItem",
        items: ["menu"],
      },
      {
        slug: "menubar",
        title: "Menubar",
        parts: "Menubar, Menu",
        items: ["menubar", "menu"],
      },
      {
        slug: "toast",
        title: "Toast",
        parts: "ToastRegion, Toast, toast()",
        items: ["toast"],
      },
    ],
  ],
  [
    "Navigation and structure",
    [
      {
        slug: "tabs",
        title: "Tabs",
        parts: "Tabs, TabsList, TabsTab, TabsPanel",
        items: ["tabs"],
      },
      {
        slug: "navigation-menu",
        title: "Navigation menu",
        parts: "NavigationMenu, NavigationMenuTrigger, NavigationMenuLink",
        items: ["navigation-menu"],
      },
      {
        slug: "pagination",
        title: "Pagination",
        parts: "Pagination, PaginationList, PaginationLink",
        items: ["pagination"],
      },
      {
        slug: "accordion",
        title: "Accordion",
        parts: "Accordion, AccordionItem, AccordionTrigger, AccordionPanel",
        items: ["accordion"],
      },
      {
        slug: "collapsible",
        title: "Collapsible",
        parts: "Collapsible, CollapsibleTrigger, CollapsiblePanel",
        items: ["collapsible"],
      },
      {
        slug: "tree",
        title: "Tree",
        parts: "Tree, TreeItem, TreeItemLabel, TreeGroup",
        items: ["tree"],
      },
      {
        slug: "resizable",
        title: "Resizable",
        parts: "Resizable, ResizablePanel, ResizableHandle",
        items: ["resizable"],
      },
      {
        slug: "scroll-area",
        title: "Scroll area",
        parts: "ScrollArea, ScrollAreaViewport, ScrollAreaScrollbar",
        items: ["scroll-area"],
      },
      { slug: "separator", title: "Separator", parts: "Separator", items: ["separator"] },
    ],
  ],
  [
    "Showing information",
    [
      {
        slug: "avatar",
        title: "Avatar",
        parts: "Avatar, AvatarImage, AvatarFallback",
        items: ["avatar"],
      },
      {
        slug: "avatar-group",
        title: "Avatar group",
        parts: "AvatarGroup (Avatar)",
        items: ["avatar-group"],
      },
      {
        slug: "progress",
        title: "Progress",
        parts: "Progress, ProgressTrack, ProgressIndicator",
        items: ["progress"],
      },
      {
        slug: "meter",
        title: "Meter",
        parts: "Meter, MeterTrack, MeterIndicator",
        items: ["meter"],
      },
      {
        slug: "timeline",
        title: "Timeline",
        parts: "Timeline, TimelineItem, TimelineMarker",
        items: ["timeline"],
      },
      {
        slug: "waterfall",
        title: "Waterfall",
        parts: "Waterfall, WaterfallRow, WaterfallBar",
        items: ["waterfall"],
      },
      {
        slug: "carousel",
        title: "Carousel",
        parts: "Carousel, CarouselViewport, CarouselItem",
        items: ["carousel"],
      },
      {
        slug: "image-cropper",
        title: "Image cropper",
        parts: "ImageCropper, ImageCropperViewport, ImageCropperSelection",
        items: ["image-cropper"],
      },
      {
        slug: "preferences",
        title: "Preferences",
        parts: "Preferences, createPreference",
        items: ["preferences"],
      },
    ],
  ],
  [
    "App shell and page structure",
    [
      {
        slug: "app-shell",
        title: "App shell",
        parts:
          "AppShell, SidebarNav, SidebarGroup, SidebarItem (Drawer, Tooltip, Preferences, useShortcut)",
        items: ["app-shell"],
        wide: true,
      },
      {
        slug: "breadcrumbs",
        title: "Breadcrumbs",
        parts: "nav, ol, aria-current",
        items: ["breadcrumbs"],
      },
      {
        slug: "page-header",
        title: "Page header",
        parts: "PageHeader",
        items: ["page-header"],
      },
      {
        slug: "card",
        title: "Card",
        parts: "Card, CardHeader, CardTitle, CardContent, CardFooter",
        items: ["card"],
      },
      {
        slug: "stepper",
        title: "Stepper",
        parts: "Stepper (Button, aria-current=step)",
        items: ["stepper"],
      },
      {
        slug: "search-field",
        title: "Search field",
        parts: "SearchField (Input, createInputController, useShortcut)",
        items: ["search-field"],
      },
    ],
  ],
  [
    "Data display",
    [
      {
        slug: "table",
        title: "Table",
        parts: "Table, TableHeader, TableBody, TableRow, TableHead, TableCell (ScrollArea)",
        items: ["table"],
        wide: true,
      },
      { slug: "badge", title: "Badge", parts: "Badge, CountBadge", items: ["badge"] },
      { slug: "stat", title: "Stat", parts: "Stat", items: ["stat"] },
      {
        slug: "empty-state",
        title: "Empty state",
        parts: "EmptyState",
        items: ["empty-state"],
      },
      {
        slug: "skeleton",
        title: "Skeleton and loading",
        parts: "Skeleton, SkeletonText, Loading",
        items: ["skeleton"],
      },
      {
        slug: "description-list",
        title: "Description list",
        parts: "DescriptionList",
        items: ["description-list"],
      },
      {
        slug: "item-list",
        title: "Item list",
        parts: "ItemList, Item",
        items: ["item-list"],
      },
      { slug: "alert", title: "Alert", parts: "Alert", items: ["alert"] },
      {
        slug: "kbd",
        title: "Keyboard keys",
        parts: "Kbd (useShortcutHint)",
        items: ["kbd"],
      },
      { slug: "spinner", title: "Spinner", parts: "Spinner", items: ["spinner"] },
      {
        slug: "code-block",
        title: "Code block",
        parts: "CodeBlock, CodeTabs, PackageCommand (Tabs, ScrollArea, Preferences)",
        items: ["code-block"],
      },
      {
        slug: "copy-button",
        title: "Copy button",
        parts: "CopyButton (announce)",
        items: ["copy-button"],
      },
    ],
  ],
  [
    "Motion",
    [
      { slug: "number-ticker", title: "Number ticker", parts: "NumberTicker", items: ["number-ticker"] },
      { slug: "text-reveal", title: "Text reveal", parts: "TextReveal", items: ["text-reveal"] },
      { slug: "thinking", title: "Thinking", parts: "Thinking", items: ["thinking"] },
      { slug: "crossfade", title: "Crossfade", parts: "Crossfade", items: ["crossfade"] },
    ],
  ],
  [
    "Lists and trees",
    [
      {
        slug: "sortable-list",
        title: "Sortable list",
        parts: "SortableList (createReorder, createSelection)",
        items: ["sortable-list"],
      },
      {
        slug: "sortable-tree",
        title: "Sortable tree",
        parts: "SortableTree (createTreeReorder, createRovingFocus)",
        items: ["sortable-tree"],
      },
    ],
  ],
  [
    "Rich text",
    [
      {
        slug: "rich-text",
        title: "Rich text editor",
        parts:
          "RichTextEditor, RichTextContent (Toolbar, Toggle, Select, Popover, TriggerMenu, createUndoStack)",
        items: ["rich-text"],
        wide: true,
      },
    ],
  ],
  [
    "Data grid",
    [
      {
        slug: "data-grid",
        title: "Data grid",
        parts:
          "DataGrid, DataGridToolbar (grid focus, cell range, inline edit, virtualizer, Menu, Popover, Select)",
        items: ["data-grid"],
        wide: true,
      },
    ],
  ],
  [
    "Board",
    [
      {
        slug: "board",
        title: "Board",
        parts:
          "Board, BoardToolbar, BoardCardDialog (createTransfer, roving focus, Dialog, AlertDialog)",
        items: ["board"],
        wide: true,
      },
    ],
  ],
  [
    "Scheduler",
    [
      {
        slug: "scheduler",
        title: "Scheduler",
        parts:
          "Schedule, MonthView, SchedulerToolbar, EventDialog (createSpans, stackSpans, Calendar)",
        items: ["scheduler"],
        wide: true,
      },
      {
        slug: "scheduler-timeline",
        title: "Room timeline",
        parts: `Schedule axis="x" overlap={false}`,
        items: ["scheduler"],
        wide: true,
      },
    ],
  ],
  [
    "Canvas",
    [
      {
        slug: "canvas",
        title: "Canvas",
        parts:
          "Canvas, CanvasToolbar, CanvasInspector, useCanvasHistory (createViewport, createMove, createLasso, createConnect, spatialMove)",
        items: ["canvas"],
        wide: true,
      },
    ],
  ],
  [
    "Mobile",
    [
      {
        slug: "mobile",
        title: "Mobile",
        parts:
          "SwipeList, PullToRefresh, TimeWheel, WheelPicker, Sheet, ActionSheet, AppBar, TabBar (createSwipeActions, bindScrollPicker, rubberBand, Drawer, Listbox)",
        items: ["mobile"],
        wide: true,
      },
    ],
  ],
  [
    "Terminal",
    [
      {
        slug: "terminal",
        title: "Terminal",
        parts:
          "Terminal (createInputHistory, createStickToBottom, ANSI colors, streaming commands, Ctrl+C)",
        items: ["terminal"],
        wide: true,
      },
    ],
  ],
  [
    "IDE",
    [
      {
        slug: "ide",
        title: "IDE",
        parts:
          "FileTree, EditorTabs, CodeEditor, CommandPalette, ProblemsList, StatusBar (Tree, Tabs, Command, Dialog, Textarea, Resizable)",
        items: ["ide"],
        wide: true,
      },
    ],
  ],
  [
    "Charts",
    [
      {
        slug: "charts",
        title: "Charts",
        parts:
          "LineChart, BarChart, SegmentedBar, Heatmap, ScatterChart, Sparkline, Stat (chart frame: legend, table twin, listbox of data positions)",
        items: [
          "chart",
          "line-chart",
          "bar-chart",
          "segmented-bar",
          "heatmap",
          "scatter-chart",
          "sparkline",
        ],
        wide: true,
      },
    ],
  ],
]

// The registry items that wrap a UI SDK component. Each one gets an example.
const uiSdkComponents = [
  "accordion",
  "alert-dialog",
  "autocomplete",
  "avatar",
  "button",
  "calendar",
  "carousel",
  "checkbox",
  "collapsible",
  "color-picker",
  "combobox",
  "command",
  "date-input",
  "date-picker",
  "dialog",
  "drawer",
  "field",
  "file-input",
  "hover-card",
  "image-cropper",
  "input",
  "label",
  "listbox",
  "menu",
  "menubar",
  "meter",
  "navigation-menu",
  "number-input",
  "otp-input",
  "pagination",
  "password-input",
  "popover",
  "preferences",
  "progress",
  "radio",
  "rating",
  "resizable",
  "scroll-area",
  "segmented-control",
  "select",
  "separator",
  "slider",
  "switch",
  "tabs",
  "textarea",
  "time-input",
  "timeline",
  "toast",
  "toggle",
  "token-input",
  "toolbar",
  "tooltip",
  "tree",
  "trigger-menu",
  "waterfall",
] as const

function displaySource(source: string): string {
  return source.replaceAll("@/registry/uiset/ui/", "@/components/ui/")
}

// `templates/x` is the block `x`; other nested paths, like `shell/icons`, are files that
// ship inside an item.
function usesOf(source: string): string[] {
  const names = [...source.matchAll(/from "@\/registry\/uiset\/ui\/([^"]+)"/g)]
    .map(([, path]) => path!.replace(/^templates\//, ""))
    .filter((name) => !name.includes("/"))
  return [...new Set(names)]
}


// An item's example is the one named after it, else the first that shows it.
const exampleSlugByItem = new Map<string, string>()
for (const [, metas] of groups)
  for (const meta of metas)
    for (const item of meta.items)
      if (!exampleSlugByItem.has(item) || meta.slug === item)
        exampleSlugByItem.set(item, meta.slug)

const exampleMetas: (ExampleMeta & { group: string })[] = groups.flatMap(
  ([group, metas]) => metas.map((meta) => ({ ...meta, group })),
)

export { displaySource, exampleMetas, exampleSlugByItem, groups, uiSdkComponents, usesOf }
export type { ExampleMeta }
