// The upload queue behind <Upload>: which file is waiting, going up, done or failed. It
// knows nothing about storage. You give it `upload`, a function that sends one file and
// reports progress; it runs a few at a time, and can cancel and retry each one.

import { announce } from "@ui-sdk/core"

type UploadStatus = "queued" | "uploading" | "done" | "failed" | "canceled"

type UploadItem = {
  file: File
  status: UploadStatus
  /** From 0 to 1. */
  progress: number
  /** Why it failed, in words to show. */
  error?: string
  /** What `upload` resolved with, like the stored file's URL. */
  result?: unknown
}

type Uploader = (
  file: File,
  transfer: {
    /** Aborts when the upload is canceled or its file removed. Pass it to `fetch`. */
    signal: AbortSignal
    /** Call with how much has gone up, from 0 to 1. */
    onProgress: (fraction: number) => void
  },
) => Promise<unknown>

type UploadMessages = {
  uploaded: (name: string) => string
  failed: (name: string, error: string) => string
  canceled: (name: string) => string
}

type UploadQueueOptions = {
  upload: Uploader
  /** How many files go up at once. 3 by default. */
  concurrency?: number
  onUploaded?: (file: File, result: unknown) => void
  onFailed?: (file: File, error: string) => void
  /** What screen readers hear as each file finishes. */
  messages?: Partial<UploadMessages>
}

const defaultMessages: UploadMessages = {
  uploaded: (name) => `${name} uploaded.`,
  failed: (name, error) => `${name} failed: ${error}`,
  canceled: (name) => `${name} canceled.`,
}

type Entry = { item: UploadItem; abort?: AbortController }

const reasonOf = (error: unknown) =>
  (error instanceof Error ? error.message : typeof error === "string" ? error : "") ||
  "The upload failed."

/** `options` is a function, so the queue always reads the latest callbacks. */
function createUploadQueue(options: () => UploadQueueOptions) {
  const entries = new Map<File, Entry>()
  const listeners = new Set<() => void>()
  let snapshot: readonly UploadItem[] = []
  let running = false

  const emit = () => {
    snapshot = [...entries.values()].map((entry) => entry.item)
    for (const listener of listeners) listener()
  }
  const say = <Key extends keyof UploadMessages>(
    key: Key,
    ...args: Parameters<UploadMessages[Key]>
  ) => {
    const message = (options().messages?.[key] ?? defaultMessages[key]) as (
      ...args: Parameters<UploadMessages[Key]>
    ) => string
    announce(message(...args))
  }

  function send(entry: Entry) {
    const { file } = entry.item
    const abort = new AbortController()
    const current = () => entries.get(file) === entry && entry.abort === abort && !abort.signal.aborted
    entry.abort = abort
    entry.item = { file, status: "uploading", progress: 0 }
    emit()
    Promise.resolve()
      .then(() => {
        // Canceled before it began (its owner went away in the same tick): never start it.
        if (!current()) return
        return options().upload(file, {
          signal: abort.signal,
          onProgress: (fraction) => {
            // A total of zero makes loaded / total not a number: keep the last value.
            if (!current() || !Number.isFinite(fraction)) return
            const progress = Math.min(1, Math.max(0, fraction))
            if (progress === entry.item.progress) return
            entry.item = { ...entry.item, progress }
            emit()
          },
        })
      })
      .then(
        (result) => {
          if (!current()) return
          entry.abort = undefined
          entry.item = { file, status: "done", progress: 1, result }
          emit()
          say("uploaded", file.name)
          options().onUploaded?.(file, result)
        },
        (error: unknown) => {
          if (!current()) return
          const reason = reasonOf(error)
          entry.abort = undefined
          entry.item = { file, status: "failed", progress: entry.item.progress, error: reason }
          emit()
          say("failed", file.name, reason)
          options().onFailed?.(file, reason)
        },
      )
      .finally(pump)
  }

  function pump() {
    if (!running) return
    const limit = Math.max(1, options().concurrency ?? 3)
    let active = 0
    for (const entry of entries.values()) if (entry.item.status === "uploading") active++
    for (const entry of entries.values()) {
      if (active >= limit) break
      if (entry.item.status !== "queued") continue
      active++
      send(entry)
    }
  }

  return {
    items: () => snapshot,
    item: (file: File) => entries.get(file)?.item,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** Follows the chosen files: new ones wait their turn, removed ones stop. */
    sync(files: readonly File[]) {
      const kept = new Set(files)
      let changed = false
      for (const [file, entry] of entries) {
        if (kept.has(file)) continue
        entry.abort?.abort()
        entries.delete(file)
        changed = true
      }
      for (const file of files) {
        if (entries.has(file)) continue
        entries.set(file, { item: { file, status: "queued", progress: 0 } })
        changed = true
      }
      if (changed) emit()
      pump()
    },
    /** Stops a file that's waiting or going up. It stays in the list, ready to retry. */
    cancel(file: File) {
      const entry = entries.get(file)
      if (!entry || (entry.item.status !== "queued" && entry.item.status !== "uploading")) return false
      entry.abort?.abort()
      entry.abort = undefined
      entry.item = { file, status: "canceled", progress: 0 }
      emit()
      say("canceled", file.name)
      pump()
      return true
    },
    /** Sends a failed or canceled file again. */
    retry(file: File) {
      const entry = entries.get(file)
      if (!entry || (entry.item.status !== "failed" && entry.item.status !== "canceled")) return false
      entry.item = { file, status: "queued", progress: 0 }
      emit()
      pump()
      return true
    },
    start() {
      running = true
      pump()
    },
    /** Stops everything in flight and puts it back in line, for when the owner goes away. */
    stop() {
      running = false
      let changed = false
      for (const entry of entries.values()) {
        if (entry.item.status !== "uploading") continue
        entry.abort?.abort()
        entry.abort = undefined
        entry.item = { file: entry.item.file, status: "queued", progress: 0 }
        changed = true
      }
      if (changed) emit()
    },
  }
}

type UploadQueue = ReturnType<typeof createUploadQueue>

export { createUploadQueue }
export type { UploadItem, UploadMessages, UploadQueue, UploadQueueOptions, UploadStatus, Uploader }
