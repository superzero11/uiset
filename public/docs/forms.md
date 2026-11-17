# Forms: inline edit and upload

Two things forms need that UI SDK leaves to you. `InlineEdit` is text you edit where it
shows, on UI SDK's `createInlineEdit`. `Upload` is a drop zone and a queue of uploads on UI
SDK's File input: each file shows its progress and can be canceled, retried or removed.
Fields, selects, checkboxes, date and number inputs are UI SDK's own components; see
[the list](./README.md#ui-sdk-components). Without React, they are `<uiset-inline-edit>` and
`<uiset-upload>` in [Web Components](./web-components.md#content-and-forms).

```bash
npx shadcn@latest add superzero11/uiset/inline-edit superzero11/uiset/upload
```

## Parts

| Part                                                    | Item          | What it is                                                        |
| ------------------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| `InlineEdit`                                            | `inline-edit` | A value that turns into a field when you press it                 |
| `InlineEditRoot`, `InlineEditPreview`, `InlineEditInput`, `InlineEditSave`, `InlineEditCancel`, `InlineEditError` | `inline-edit` | Its parts, for a layout of your own |
| `Upload`                                                | `upload`      | A drop zone, a Choose files button and the list of uploads        |
| `useUploadQueue`, `UploadRow`, `UploadPreview`          | `upload`      | The queue as a hook and one file's row, for a layout of your own  |
| `createUploadQueue`                                     | `upload`      | The queue with no React in it                                     |

## Inline edit

```tsx
import { InlineEdit } from "@/components/ui/inline-edit"

const [name, setName] = useState("Atlas")

<h1>
  <InlineEdit
    label="Project name"
    value={name}
    onValueChange={setName}
    validate={(text) => (text.trim() ? null : "A project needs a name.")}
  />
</h1>
```

- `label` is required. It names the group, the field, and the value's button ("Edit
  Project name: Atlas").
- `value` with `onValueChange(value, details)` controls it, or `defaultValue` starts it.
  `onValueChange` runs once, when an edit is saved, and not at all when the text didn't
  change. `details.reason` says how it was saved (`enter-key`, `focus-out`, `imperative`)
  and `details.source` is `"agent"` when an agent did it.
- `validate` takes the text and returns what's wrong with it, or nothing. Text that fails
  stays in the field, which is marked invalid and described by the message; the message is
  also read out. It clears as soon as the text changes.
- `placeholder` ("Empty") shows in place of an empty value.
- `disabled` leaves the value readable and reachable by Tab, but it doesn't open.
- `actions` adds Save and Cancel buttons beside the field, for touch screens, where
  there's no Escape key. `editLabel`, `saveLabel` and `cancelLabel` rename the buttons.
- It takes the type around it, so inside a heading you edit a heading. The value and the
  field share one box: nothing moves when editing starts. While editing, it takes the
  width of its row.

The root has `data-editing`, `data-empty`, `data-invalid` and `data-disabled` to style from.

## Upload

`Upload` doesn't know where files go. You give it `upload`, a function that sends one file,
reports progress and resolves when it's stored. It runs when a file is chosen, dropped or
pasted.

```tsx
import { Upload, type Uploader } from "@/components/ui/upload"

const upload: Uploader = (file, { signal, onProgress }) =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", `/api/files/${encodeURIComponent(file.name)}`)
    request.upload.onprogress = (event) => onProgress(event.loaded / event.total)
    request.onload = () =>
      request.status < 300
        ? resolve(JSON.parse(request.responseText))
        : reject(new Error(`The server said ${request.status}.`))
    request.onerror = () => reject(new Error("The connection dropped."))
    request.onabort = () => reject(new DOMException("Canceled", "AbortError"))
    signal.addEventListener("abort", () => request.abort())
    request.send(file)
  })

<Upload
  label="Attachments"
  hint="Images or PDF, up to 5 MB each"
  accept="image/*,.pdf"
  maxSize={5_000_000}
  upload={upload}
  onUploaded={(file, result) => attach(result)}
/>
```

- `label` is required. It names the upload and its list of files.
- `upload(file, { signal, onProgress })` returns a promise. Call `onProgress` with how much
  has gone up, from 0 to 1. `signal` aborts when the upload is canceled or its file is
  removed: pass it to `fetch`, or abort your request on it, as above. What the promise
  resolves with is the file's `result`. When it rejects, the error's message is the reason
  the row shows ("Failed: The connection dropped."), so write it for the person reading it.
- `concurrency` (3) is how many files go up at once. The rest wait their turn.
- `accept`, `maxSize`, `maxFiles`, `validate`, `multiple` (on by default), `disabled` and
  the rest of [File input's props](https://ui-sdk.dev/docs/components/file-input) pass
  through. Files that fail those checks aren't uploaded: each is listed under the drop zone
  with the reason ("huge.pdf is larger than 5 MB.") until the next change.
- `value` with `onValueChange(files)` controls the files, or `defaultValue` starts with
  some. Every file in the list is uploaded, so start with files only if they still need to
  go up.
- `onUploaded(file, result)` and `onFailed(file, error)` run as each one ends.
  `onItemsChange(items)` runs on every change, with each file's `status` (`queued`,
  `uploading`, `done`, `failed`, `canceled`), `progress`, `error` and `result`.
- `hint` is a line under the prompt. `labels` replaces any of the words shown, and
  `messages` what screen readers hear as files finish, for another language.
- An image shows a small preview; other files show an icon.
- Removing a file stops its upload. Cancel stops it and keeps the row, ready to retry.

Check uploads on your server too: `accept` and `maxSize` are a convenience, not a guard.

### A layout of your own

`useUploadQueue(files, { upload, concurrency, onUploaded, onFailed })` returns `{ queue,
items }`. `items` is each file's state, and `queue` has `retry(file)` and `cancel(file)`.
Render UI SDK's File input parts around it, with `UploadRow` for each file or your own row.
Outside React, `createUploadQueue(() => options)` is the same queue: call `start()`, then
`sync(files)` whenever the files change, and `subscribe(listener)` to hear about it.

## Keys

| Keys                       | Where                 | Does                                                      |
| -------------------------- | --------------------- | --------------------------------------------------------- |
| Enter, Space, F2           | an inline edit's value | Start editing, with the text selected                     |
| Enter                      | its field             | Save. Focus goes back to the value                        |
| Escape                     | its field             | Put the text back. Focus goes back to the value           |
| Tab                        | its field             | Save and move on. With text that can't be saved, stay     |
| Up, Down, Home, End        | the list of uploads   | Move between files. The list is one tab stop              |
| Delete, Backspace          | a file                | Remove it, which stops its upload                         |
| Enter                      | a file that failed or was canceled | Send it again                                |

A click outside an inline edit saves it, as Tab does. Save and Cancel, and each upload's
Cancel, Retry and Remove buttons, are for pointers and touch: they stay out of the Tab
order, because the keys above do the same from the field or the row.

## For agents

- **InlineEdit** is listed by its `label`, with `setValue` (saves the text, through
  `validate`: text that fails changes nothing), `startEditing` and `cancel`. A disabled one
  has no actions.
- **Upload** is a file input listed by its `label`, with each row's text as its items
  ("report.pdf 248 kB Uploaded") and `clear`. An agent can't add files: it has none to
  give. Each row's Cancel and Retry are buttons named for the file ("Retry report.pdf"),
  which an agent presses. Each upload's progress bar is listed as "Uploading report.pdf".
- Removing one file is not something an agent can do yet: UI SDK's bridge doesn't offer the
  File input's Remove buttons, and its `removeFile` takes a `File`. `clear` removes them
  all.
- Neither asks for confirmation.

## Web Components

`<uiset-inline-edit>` and `<uiset-upload>` aren't built yet. The upload queue
(`upload/queue.ts`) and the inline edit primitive (`inline-edit/inline-edit.ts`) have no
React in them, so the elements will share them.
