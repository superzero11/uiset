<!-- From UI SDK's docs (@ui-sdk/react 0.1.0-beta.5, Apache-2.0). Written by scripts/docs.mjs; don't edit. -->

## API Reference

Props are the same as below, as React props.

### FileInput

- `accept?` (`string | readonly string[]`): The files to accept, like the `accept` attribute: MIME types (`"image/png"`), wildcards (`"image/*"`) and extensions (`".pdf"`), in a comma-separated string or an array. Without it, any file.
- `maxFiles?` (`number`): The most files accepted at a time. The first ones that pass the other checks are accepted, and the rest are rejected.
- `maxSize?` (`number`): The largest size accepted, in bytes.
- `minSize?` (`number`): The smallest size accepted, in bytes.
- `validate?` (`((file: File) => string | null | undefined | void)`): A check of your own. Return a reason, like `"duplicate"`, to reject the file, or nothing to accept it.
- `value?` (`File[]`): The files, to control the file input.
- `defaultValue?` (`File[]`): The files at first, when uncontrolled. A form reset returns to them.
- `onValueChange?` (`((value: File[], details: FileInputValueChangeDetails) => void)`): Runs when files are added or removed, with what changed in the details. `details.cancel()` stops it.
- `onReject?` (`((rejected: FileRejection[], details: CommitDetails<FileInputValueChangeReason>) => void)`): Runs when files fail the checks, after `onValueChange`, with every reason each failed, even when none were accepted.
- `multiple?` (`boolean`): Holds more than one file. New files join the ones it has, up to `maxFiles` in all. Without it, a new file replaces the one it has.
- `directory?` (`boolean`): Picks a whole folder, with every file inside it. Turns on `multiple`.
- `capture?` (`"environment" | "user" | boolean`): Opens the camera on phones instead of the files: `"user"` for the front camera, `"environment"` for the back one, or `true` for the default one.
- `name?` (`string`): The name the files submit under. Without one, nothing is submitted.
- `form?` (`string`): The id of a form to belong to, when it isn't inside that form.
- `required?` (`boolean`): Blocks form submission until it holds a file, with the browser's own message.
- `disabled?` (`boolean`): Disables it like a native control: the trigger can't be focused or used, drops and pastes are ignored, and nothing is submitted.
- `announcement?` (`((change: FileInputChange) => string | null | undefined)`): What screen readers hear after a change. Return null for nothing.
- `controller?` (`object`): Adds and removes files from anywhere. Create one with `createFileInputController()`.
- `debug?` (`boolean`): Logs every state change with its reason to the console, in development builds.

### FileInputTrigger

- `controller?` (`object`): Connects a trigger outside the file input, like one in a toolbar, to the file input with this controller.

### FileInputDropzone

- `target?` (`FileInputDropzoneTarget`): Where it takes drops. `"document"` takes files dropped anywhere on the page, and the zone shows `data-dragging` while files are over the window, so it can be a full-page overlay.
- `pasteTarget?` (`FileInputPasteTarget`): Somewhere else to take pasted files from, on top of pastes while focus is inside the zone: `"document"`, an element, a CSS selector, or a function that returns an element, like a prompt's text area. Text pastes are left alone.

### FileInputList

Renders its children once for each file.

### FileInputItem

- `file` (`File`): The file this item shows. The list passes it to the items it renders.

### FileInputItemRemove

Removes its item's file. It's named for the file and stays out of the Tab order.

### State

The root's, the trigger's and the list's state:

- `value` (`readonly File[]`): The files it holds.
- `disabled` (`boolean`): Whether it's disabled, by itself or by a `<fieldset>`.
- `required` (`boolean`): Whether a form won't submit while it holds no files.
- `dragging` (`boolean`): Whether files are being dragged over one of its drop zones.

A drop zone's:

- `dragging` (`boolean`): Whether files are being dragged over it, or over the page for a page-wide zone.
- `dragAccept` (`boolean`): Whether the dragged files look acceptable, from their types and count.
- `dragReject` (`boolean`): Whether a dragged file has a type `accept` rules out, or there are too many.
- `disabled` (`boolean`): Whether the file input is disabled, by itself or by a `<fieldset>`, so drops and pastes are ignored.

An item's:

- `file` (`File`): The file this item shows: the one its `FileInputList` renders it for, or its `file` prop.
- `index` (`number`): Where it is in the value, from 0.
- `disabled` (`boolean`): Whether the file input is disabled, so the item can't be removed.

A remove button's:

- `disabled` (`boolean`): Whether the file input is disabled, so the button can't remove its file.

### Reasons

- `picker` (`Event`): Files were chosen in the system's file picker. Its input's `change` event.
- `drop` (`DragEvent`): Files were dropped on a drop zone, or text and tokens on a token input.
- `paste` (`ClipboardEvent`): Files were pasted, like a screenshot, or text and tokens into a token input.
- `remove-press` (`MouseEvent | KeyboardEvent`): A chip's remove part was pressed, or Backspace or Delete removed a chip or a span.
- `reset` (`none`): A form reset.
- `imperative` (`none`): A controller or `api` call, or a property set on a web component.

Rejected files carry one or more of these reasons, or a reason from your `validate`: `file-type`, `file-too-large`, `file-too-small` and `too-many-files`.

### Controller

Create one with `createFileInputController()` and pass it as `controller`.

- `getValue()` (`() => readonly File[]`): The files it holds.
- `setValue(files, options?)` (`(files: readonly File[], options?: FileInputChangeOptions | undefined) => boolean`): Replaces the files, without checking them. Returns false when canceled.
- `addFiles(files, options?)` (`(files: readonly File[] | FileList, options?: FileInputChangeOptions | undefined) => boolean`): Runs files through the checks and adds the accepted ones, like a drop. Returns false when disabled or canceled.
- `removeFile(file, options?)` (`(file: File, options?: FileInputChangeOptions | undefined) => boolean`): Removes one file. Returns false when it isn't there, or the change is canceled.
- `clear(options?)` (`(options?: FileInputChangeOptions | undefined) => boolean`): Removes every file.
- `open()` (`() => boolean`): Opens the file picker. Browsers only allow it during a user action, like a click. Returns false when disabled.
- `focus()` (`() => void`): Moves focus to the trigger.
- `isDragging()` (`() => boolean`): Whether files are being dragged over a drop zone.

## Accessibility

Keep a trigger available alongside a drop zone for people using a keyboard or screen reader. Changes are announced through a polite live region, and the file list supports keyboard navigation and removal.

**Drops and pastes**

- Dropped files are reported, the rejected ones with every reason.
- Files over the zone show data-dragging and data-drag-accept until they leave.
- A type the file input doesn't accept shows data-drag-reject.
- More files than the file input takes show data-drag-reject.
- The drag state holds while the drag crosses the zone's children.
- Text dragged over the zone is ignored.
- A drag that started in the page is ignored, even with files.
- The first files up to maxFiles are accepted and the rest rejected.
- MaxFiles counts the files the file input already holds.
- Without multiple, the first file is accepted, and a new one replaces it.
- A disabled file input takes no drops and shows no drag state.
- Files dropped outside the zone don't open in the browser.
- Pasting files while focus is inside the zone reports them.
- Pasting text is left alone.
- Pasting files into the paste target reports them.
- A page-wide zone shows while files are over the window.
- A page-wide zone takes files dropped anywhere.
- A drop on a zone doesn't reach a page-wide zone.
- Render functions get the drag state. React and Vue only.

**The picker**

- A trigger alone opens the file picker, and the chosen file is reported.
- Files the accept list rules out are rejected.
- An unnamed file input empties its input after each choice, so the same file can be chosen again.
- A folder picker reports every file inside the folder.
- The input carries accept, capture, multiple and directory.
- The input stays out of the tab order and the accessibility tree.
- With multiple, chosen files join the ones dropped before.

**Forms**

- A named file input submits the chosen files with its form.
- Rejected files are never submitted.
- A named file input with no files submits an empty file, like a native input.
- Files dropped on the zone go in the form.
- Canceling a change keeps its files out of the form.
- A form reset clears the files.
- A required file input blocks submission and shows the field's error.
- Files set from script update the field even when the announcement throws. Web components only.
- The field's label and the button's text name the trigger, and its description describes it.
- A press on the field's label opens the picker.
- A disabled file input disables its trigger.

Runs in React, Vue and web components.

- Each file shows as an item in the list, in order.
- A remove button is named after its file, and removes it.
- The list is one tab stop, and arrow keys, Home and End move between items.
- Backspace on a focused item removes it and focuses the next one.
- A removal is announced politely.
- A canceled change leaves the list as it was.
- A form reset empties the list.
- A controlled file input shows the value it's given. React and Vue only.
- A removal a controlled owner ignores keeps the item and its focus. React and Vue only.
- The value property sets the files quietly on web components, and the api reports. Web components only.
- The remove buttons are out of the tab order.

Runs in React, Vue and web components.

- No axe violations at first.
- No axe violations while dragging.
- No axe violations with files in the list.
- No axe violations with the field's error showing.
- No axe violations when disabled.
- The zone isn't a control: the trigger inside it is the one tab stop.
- The accessibility tree is the same everywhere.
- Accepted and rejected counts are announced politely.
- A choice from the picker is announced too.

Runs in React, Vue and web components.
