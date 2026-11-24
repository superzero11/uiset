import { Upload, type Uploader } from "../../src/upload"

// Stands in for your storage: it takes two seconds, and the export fails the first time.
const dropped = new WeakSet<File>()
const upload: Uploader = (file, { signal, onProgress }) =>
  new Promise((resolve, reject) => {
    let sent = 0
    const step = () => {
      sent += 0.2
      onProgress(sent)
      if (file.name.startsWith("export") && !dropped.has(file) && sent > 0.5) {
        dropped.add(file)
        return reject(new Error("The connection dropped."))
      }
      if (sent >= 1) return resolve({ url: `/files/${file.name}` })
      timer = setTimeout(step, 400)
    }
    let timer = setTimeout(step, 400)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new DOMException("Canceled", "AbortError"))
    })
  })

const cover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" fill="#3b5bdb"/><circle cx="12" cy="13" r="5" fill="#ffd43b"/><path d="M0 36l12-13 8 8 6-5 10 10z" fill="#e7f5ff"/></svg>`

const files = [
  new File([new Uint8Array(248_000)], "roadmap.pdf", { type: "application/pdf" }),
  new File([cover], "cover.svg", { type: "image/svg+xml" }),
  new File([new Uint8Array(1_800_000)], "export.csv", { type: "text/csv" }),
]

export default function UploadExample() {
  return (
    <Upload
      label="Attachments"
      hint="Images, PDF or CSV, up to 5 MB each"
      accept="image/*,.pdf,.csv"
      maxSize={5_000_000}
      maxFiles={6}
      defaultValue={files}
      upload={upload}
    />
  )
}
