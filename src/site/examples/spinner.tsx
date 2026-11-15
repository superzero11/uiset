import { Spinner } from "@/registry/uiset/ui/spinner"

export default function SpinnerExample() {
  return (
    <div className="row">
      <Spinner label="Saving" /> <span className="example-note">Saving…</span>
    </div>
  )
}
