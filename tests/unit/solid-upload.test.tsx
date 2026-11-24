import { render, screen, waitFor, within } from "@solidjs/testing-library"
import type { ComponentProps } from "@solidjs/web"
import userEvent from "@testing-library/user-event"
import { createAgent } from "@ui-sdk/solid/agent"
import { flush as apply } from "solid-js"
import { expect, test, vi } from "vitest"
import { Upload } from "@/solid/src/upload"
import type { Uploader } from "@/registry/uiset/ui/upload/queue"
import { settle } from "./solid-bridge"

// Upload in Solid, with React's assertions for the component (tests/unit/upload.test.tsx).
// The queue's own tests are shared logic, in React's file.

const agent = createAgent()
const tick = () => settle(0)
const file = (name: string, size = 10, type = "text/plain") => new File([new Uint8Array(size)], name, { type })
const act = async (run: () => unknown) => {
  await run()
  apply()
}

/** An uploader the test drives: each started upload waits to be finished by name. */
function manualUploader() {
  const started: string[] = []
  const live = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void; progress: (n: number) => void; signal: AbortSignal }>()
  const upload: Uploader = (f, { signal, onProgress }) =>
    new Promise((resolve, reject) => {
      started.push(f.name)
      live.set(f.name, { resolve, reject, progress: onProgress, signal })
      signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    })
  return { upload, started, live }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function setup(props: Partial<ComponentProps<typeof Upload>> = {}) {
  const manual = manualUploader()
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  const view = render(() => <Upload label="Attachments" upload={manual.upload} {...props} />)
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')!
  return { ...manual, user, input, view }
}

const row = (name: string) => screen.getByText(name).closest<HTMLElement>('[data-slot="file-input-item"]')!

test("chosen files show as rows with their size, progress and status", async () => {
  const { user, input, live, started } = setup()
  // Named with the upload's label, apart from any other upload on the page.
  expect(screen.getByRole("button", { name: "Choose files, Attachments" })).toBeTruthy()
  await user.upload(input, [file("notes.txt", 2048), file("plan.txt", 10)])
  await tick()
  expect(started).toEqual(["notes.txt", "plan.txt"])
  const list = screen.getByRole("list", { name: "Attachments" })
  expect(within(list).getAllByRole("listitem")).toHaveLength(2)
  expect(row("notes.txt").textContent).toContain("2 kB")
  expect(row("notes.txt").textContent).toContain("Uploading, 0%")
  await act(() => live.get("notes.txt")!.progress(0.42))
  expect(row("notes.txt").textContent).toContain("Uploading, 42%")
  const bar = within(row("notes.txt")).getByRole("progressbar", { name: "Uploading notes.txt" })
  expect(bar.getAttribute("aria-valuenow")).toBe("42")
  await act(async () => {
    live.get("notes.txt")!.resolve("ok")
    await flush()
  })
  expect(row("notes.txt").textContent).toContain("Uploaded")
  expect(within(row("notes.txt")).queryByRole("progressbar")).toBeNull()
  await waitFor(() => expect(document.body.textContent).toContain("notes.txt uploaded."))
})

test("a failed row says why, retries on Enter and with its button, and is removed with Remove", async () => {
  const onValueChange = vi.fn()
  const { user, input, live, started } = setup({ onValueChange })
  await user.upload(input, [file("export.csv")])
  await tick()
  await act(async () => {
    live.get("export.csv")!.reject(new Error("The connection dropped."))
    await flush()
  })
  expect(row("export.csv").textContent).toContain("Failed: The connection dropped.")
  expect(row("export.csv").textContent).toContain("Press Enter to retry.")
  await waitFor(() => expect(document.body.textContent).toContain("export.csv failed: The connection dropped."))
  const retry = screen.getByRole("button", { name: "Retry export.csv" })
  expect(retry.getAttribute("tabindex")).toBe("-1")

  row("export.csv").focus()
  await user.keyboard("{Enter}")
  await tick()
  expect(started).toEqual(["export.csv", "export.csv"])
  expect(row("export.csv").textContent).toContain("Uploading")

  await act(async () => {
    live.get("export.csv")!.reject(new Error("Again."))
    await flush()
  })
  await user.click(screen.getByRole("button", { name: "Retry export.csv" }))
  await tick()
  expect(started).toHaveLength(3)

  await act(async () => {
    live.get("export.csv")!.resolve("ok")
    await flush()
  })
  await user.click(screen.getByRole("button", { name: "Remove export.csv" }))
  await tick()
  expect(screen.queryByText("export.csv")).toBeNull()
  expect(onValueChange.mock.calls.at(-1)![0]).toEqual([])
})

test("Cancel stops an upload and leaves the row ready to retry", async () => {
  const { user, input, live } = setup()
  await user.upload(input, [file("video.mov")])
  await tick()
  const transfer = live.get("video.mov")!
  await user.click(screen.getByRole("button", { name: "Cancel video.mov" }))
  await tick()
  expect(transfer.signal.aborted).toBe(true)
  expect(row("video.mov").textContent).toContain("Canceled")
  expect(screen.getByRole("button", { name: "Retry video.mov" })).toBeTruthy()
  expect(screen.queryByRole("button", { name: "Cancel video.mov" })).toBeNull()
})

test("files that fail the checks are listed with the reason, and aren't uploaded", async () => {
  const { user, input, started } = setup({ maxSize: 1000, accept: ".txt,.csv" })
  await user.upload(input, [file("big.txt", 5000), file("ok.txt", 10)])
  await tick()
  expect(started).toEqual(["ok.txt"])
  expect(screen.getByText("big.txt is larger than 1 kB.")).toBeTruthy()
  await user.upload(input, [file("fine.csv", 10)])
  await tick()
  expect(screen.queryByText("big.txt is larger than 1 kB.")).toBeNull()
})

test("an agent finds each row's buttons by the file's name", async () => {
  const { user, input, live, started } = setup()
  await user.upload(input, [file("export.csv")])
  await tick()
  await act(async () => {
    live.get("export.csv")!.reject(new Error("The connection dropped."))
    await flush()
  })
  const labels = agent.snapshot().filter((e) => !e.offPage).map((e) => e.label)
  for (const entry of agent.snapshot().filter((e) => !e.offPage && e.component !== "more"))
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  expect(labels).toContain("Retry export.csv")
  // The upload goes by its own label, not by "Choose files", which every file input says.
  expect(labels).toContain("Attachments")
  expect(labels).not.toContain("Choose files")
  expect(screen.getByRole("group", { name: "Attachments" })).toBeTruthy()
  const result = await agent.act({ steps: [{ ref: "Retry export.csv", action: "press" }] })
  expect(result.ok, result.error?.message).toBe(true)
  await tick()
  expect(started).toEqual(["export.csv", "export.csv"])
})
