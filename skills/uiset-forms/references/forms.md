# Forms: schema form, inline edit, tag input and upload

Four things forms need that UI SDK leaves to you. `SchemaForm` draws a whole form from one
definition, steps and review included, and the same definition lets an agent fill it.
`InlineEdit` is text you edit where it shows, on UI SDK's `createInlineEdit`. `TagInput` is
tags people type, paste or pick, on UI SDK's Combobox. `Upload` is a drop zone and a queue of
uploads on UI SDK's File input: each file shows its progress and can be canceled, retried or
removed. Fields, selects, checkboxes, date and number inputs are UI SDK's own components; see
[the list](./README.md#ui-sdk-components).

```bash
npx shadcn@latest add @uiset/schema-form @uiset/inline-edit @uiset/tag-input @uiset/upload
```

## Parts

| Part                                                    | Item          | What it is                                                        |
| ------------------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| `SchemaForm`                                            | `schema-form` | A form drawn from `defineForm`: fields, steps, review, submit     |
| `defineForm`, `validateForm`, `toJSONSchema`            | `schema-form` | The definition, its checks, and its fields as JSON Schema         |
| `formTool`, `registerFormTool`                          | `schema-form` | The form as an agent tool, for a model SDK or the browser's agent |
| `InlineEdit`                                            | `inline-edit` | A value that turns into a field when you press it                 |
| `InlineEditRoot`, `InlineEditPreview`, `InlineEditInput`, `InlineEditSave`, `InlineEditCancel`, `InlineEditError` | `inline-edit` | Its parts, for a layout of your own |
| `TagInput`                                              | `tag-input`   | Tags in a field: typed, pasted or picked, edited in place         |
| `addTags`, `splitTags`, `normalizeTag`                  | `tag-input`   | Its rules with no React in them, for your own checks              |
| `Upload`                                                | `upload`      | A drop zone, a Choose files button and the list of uploads        |
| `useUploadQueue`, `UploadRow`, `UploadPreview`          | `upload`      | The queue as a hook and one file's row, for a layout of your own  |
| `createUploadQueue`                                     | `upload`      | The queue with no React in it                                     |

## Schema form

Describe the form once. Its fields draw the form with UISet's controls, check what people
type, and become an agent tool's input:

```tsx
import { defineForm, SchemaForm, type FormValues } from "@/components/ui/schema-form"

const invite = defineForm({
  name: "invite_teammate", // the tool's name
  title: "Invite a teammate",
  description: "They get an email with a link to join the workspace.",
  fields: {
    email: { kind: "email", label: "Email", required: true },
    role: {
      kind: "choice",
      label: "Role",
      display: "radio",
      default: "editor",
      options: [
        { value: "viewer", label: "Viewer" },
        { value: "editor", label: "Editor" },
      ],
    },
    seats: { kind: "number", label: "Seats", min: 1, max: 50, step: 1, default: 1 },
    notify: { kind: "boolean", label: "Email me when they join", display: "switch" },
  },
  steps: [
    { title: "Who", fields: ["email"] },
    { title: "Access", fields: ["role", "seats", "notify"] },
  ],
})

type Invite = FormValues<typeof invite.fields> // { email: string; role: "viewer" | "editor" | null; … }

<SchemaForm
  form={invite}
  labels={{ submit: "Send invite" }}
  confirm="Sends an invite email to the address given"
  doneMessage="Invite sent."
  onSubmit={async (values) => {
    const response = await sendInvite(values)
    if (response.status === 409) return { email: "They're already in this workspace." }
  }}
/>
```

- **Kinds:** `text`, `email`, `url`, `tel`, `textarea`, `number`, `choice` (a select, or
  radios with `display: "radio"`), `boolean` (a checkbox, or a switch), `date` (an ISO
  date) and `tags` (a [tag input](#tag-input): a list of strings, with `suggestions` and
  `maxLength` per tag). Each takes `label`, `description`, `required`, `placeholder` and
  `default`, and the checks its kind has: `min` and `max` (length, value, date or how many
  tags), `step` (1 for whole numbers), `pattern` with `patternMessage`, and
  `validate(value, values)` for a rule of your own. An agent fills `tags` with a list, or
  with text like "design, research".
- **Rules across fields:** pass any Standard Schema as `schema` (zod, valibot, arktype and
  others implement it). It runs on submit once every field passes; an issue goes under the
  field its path names, or above the actions.
- **When problems show:** leaving a field shows what's wrong with what was typed; an empty
  required field waits for Next or Submit. Those check the step, or everything, and move
  focus to the first problem. A field showing a problem is checked again as it changes.
- **Steps:** every field is in one step. Next checks the step, and so does Enter in any
  of its fields; the steps above the form go back to any step done; the last Next shows a
  review of every value with an Edit per step, and Submit sends. When a step change takes
  away what had focus (the field you pressed Enter in, Back on the first step, an Edit),
  focus goes to the new step's first field, or to the submit on the review.
- **`onSubmit`** gets the values. Return problems by field (`{ email: "…" }`), or under
  `form` for the whole form, and they show where they belong, on their step, with focus on
  the first. A thrown error shows under `form`. `doneMessage` is said and shown once it's sent.
- **Controlled or not:** `value`, `defaultValue`, `onValueChange`, and `step`,
  `defaultStep`, `onStepChange`, as every UI SDK component.
- **Words:** `labels` (Next, Back, Submit, the review's words) and the definition's
  `messages` translate everything it says.

### An agent fills it; a person sends it

The form is one component to an agent, named by its title, with its fields as items and
three actions:

```ts
await agent.act({
  steps: [{ ref: "Invite a teammate", action: "fill", args: [{ Email: "grace@example.com", role: "Editor", seats: "3" }] }],
})
```

- **`fill`** takes values by field name or label, as each field takes them: a number from
  "3", a choice by its value or its label, a switch from "yes". What it can't fill, and
  what it fills but is wrong, shows under the fields and comes back as the step's error, so
  the agent can correct it: `Seats is at most 50. No field "phone". Its fields: Email, Role,
  Seats, …`.
- **`goTo(step)`** shows a step, checking the steps on the way as Next does; the review is
  the step after the last. **`reset`** starts over.
- **The submit needs a person.** The submit button carries `data-agent-confirm` with
  `confirm` (the form's title by default), so an agent's press waits for your bridge's
  `allow` to ask, or fails with "Needs a person". `confirm={false}` lets an agent send it.

### The same definition as a tool

`formTool(form, agent)` is the form as a tool a model calls: its name, a description, the
fields as JSON Schema, and `execute`, which fills the form on the page through your bridge,
so `allow` and the confirmation still apply and the person sees every value land.

```ts
import { jsonSchema, tool } from "ai"
import { formTool, registerFormTool } from "@/components/ui/schema-form"

const invite = formTool(inviteForm, agent) // add { submit: "Send invite" } to press it after filling
const tools = { [invite.name]: tool({ description: invite.description, inputSchema: jsonSchema(invite.inputSchema), execute: invite.execute }) }

// Or for the browser's own agent, over WebMCP, beside UI SDK's registerTools:
const unregister = registerFormTool(inviteForm, agent)
```

`toJSONSchema(form)` gives the schema alone: `required` fields, `enum` for choices (with
their labels in the description), `format` for emails, links and dates, and the limits.

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

## Tag input

```tsx
import { TagInput } from "@/components/ui/tag-input"

const [topics, setTopics] = useState(["React"])

<TagInput
  label="Topics"
  value={topics}
  onValueChange={setTopics}
  suggestions={["Accessibility", "CSS", "Design systems", "TypeScript"]}
  max={5}
  maxLength={24}
  description="Pick or type one, and separate them with commas."
/>
```

- **Adding:** Enter adds what's typed, and so does a comma (`delimiters` changes which
  characters end a tag: `[",", ";", " "]` for email addresses). A pasted list becomes one
  tag each, split on the delimiters and on line breaks. Leaving the field adds what's
  typed; `addOnBlur={false}` keeps it typed instead.
- **Editing:** Enter or F2 on a tag, or a double-click, puts its text back in the field
  and marks the tag (dashed) in its place. Enter saves it there, Escape keeps the old one,
  and saving it empty removes it.
- **Rules:** tags are trimmed and their inner spaces collapse. No duplicates, ignoring
  case (`unique`: `true` to match case, `false` to allow them). `max` tags, with "2 of 5"
  under the field, and `maxLength` characters each. `validate(tag, tags)` returns what's
  wrong, and `transform(tag)` changes a tag first (like lowercase). A refused tag stays
  typed, or listed, with the reason under the field, read out: "Already added: react".
- **Suggestions:** `suggestions` fills a list as you type, without the tags already in.
  Without them there's no list. Anything can be typed either way.
- `value` with `onValueChange(tags, details)` controls it, or `defaultValue` starts it.
  `details.reason` is `add`, `paste`, `edit`, `remove` or `set`, and `details.source` is
  `"agent"` when an agent did it.
- `name` submits one form entry per tag. `disabled`, `readOnly`, `required`, `placeholder`,
  `error` (a problem from outside, like a form's) and `onBlur` are there too, and `messages`
  translates what it says.
- Chips are Combobox's (`data-slot="combobox-chip"`), so a Combobox with `multiple` wears
  the same chips. Skins set `--uiset-chip-bg`, `--uiset-chip-fg`, `--uiset-chip-border`,
  `--uiset-chip-radius` and `--uiset-chip-weight`.

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
| Enter                      | a schema form's field | Next on a step; Submit on the review or a form with no steps |
| Enter, Space, F2           | an inline edit's value | Start editing, with the text selected                     |
| Enter                      | its field             | Save. Focus goes back to the value                        |
| Enter, comma               | a tag input's field   | Add what's typed                                          |
| Left, Right                | a tag input           | Move between the tags and the field (Combobox's)          |
| Backspace                  | an empty tag input's field | Remove the last tag (Combobox's)                     |
| Enter, F2                  | a tag                 | Edit it in place: its text goes back in the field         |
| Delete, Backspace          | a tag                 | Remove it (Combobox's)                                    |
| Escape                     | a tag being edited    | Keep the old tag                                          |
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
- **TagInput** is one component listed by its `label`, whose value is the tags, with
  `setValue(tags)`, `add(...tags)` and `remove(...tags)` (by name, ignoring case). They go
  through the same rules as typing; a refusal fails the step with the reason ("Already
  added: react", "Up to 5 tags"). The Combobox inside is the person's and is hidden from
  agents: its `setValue` waits about four seconds for a list of options a tag input
  doesn't have.
- **Upload** is a file input listed by its `label`, with each row's text as its items
  ("report.pdf 248 kB Uploaded") and `clear`. An agent can't add files: it has none to
  give. Each row's Cancel and Retry are buttons named for the file ("Retry report.pdf"),
  which an agent presses. Each upload's progress bar is listed as "Uploading report.pdf".
  Its Choose files button carries the label too ("Choose files, Attachments"), so an agent
  reading the page can tell two uploads' apart.
- Removing one file is not something an agent can do yet: UI SDK's bridge doesn't offer the
  File input's Remove buttons, and its `removeFile` takes a `File` (reported as
  vercel-labs/ui#782). `clear` removes them all.
- Neither asks for confirmation.

## Web Components

`<uiset-schema-form>`, `<uiset-inline-edit>`, `<uiset-tag-input>` and `<uiset-upload>` are in
[Web Components](./web-components.md#content-and-forms), on the same primitives and queue.

```html
<uiset-tag-input label="Topics" value="React, CSS" max="5" max-length="24"
  description="Pick or type one, and separate them with commas."></uiset-tag-input>
```

The tag input's attributes are React's props: `delimiters` is a string, each character one
delimiter (`delimiters=",; "`), and `add-on-blur="false"` turns that off. `suggestions`,
`validate`, `transform` and `messages` are properties. It fires `valuechange`
(`preventDefault()` refuses), and its `value` is live.
The schema form's element takes the same definition, from `@uiset/web`:

```html
<uiset-schema-form id="invite" confirm="Sends an invite email to the address given" done-message="Invite sent."></uiset-schema-form>
```

```ts
import { defineForm, formTool } from "@uiset/web"

const invite = document.querySelector("uiset-schema-form")! // typed by @uiset/web
invite.labels = { submit: "Send invite" }
invite.send = async (values) => {
  const response = await sendInvite(values)
  if (response.status === 409) return { email: "They're already in this workspace." }
}
invite.form = defineForm({ … }) // as above
invite.addEventListener("valuechange", (e) => save(e.detail.value)) // preventDefault() refuses
```

- `send` is React's `onSubmit`: what it returns shows. `value` is live, as a text field's:
  read it after `input`, set it to fill the fields (fields left out go to their defaults;
  setting it fires nothing). Vue's `v-model` works on it.
- `defaultValue` (set it before `form`), `default-step`, `step`, `disabled`, `labels` and
  `locale` are React's props. `heading` is the title's level (2, 3 or 4, or `false`); with `false`, name it with
  `label`. `confirm="false"` lets an agent send it.
- It fires `valuechange` and `stepchange`. `api` has `fill`, `goTo`, `next`, `back`,
  `submit` and `reset`, and agents see the same form React's does. `formTool` and
  `registerFormTool` take the element's `form` and your bridge.
