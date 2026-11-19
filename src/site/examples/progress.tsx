import { Progress, ProgressLabel, ProgressRing, ProgressValue } from "@/registry/uiset/ui/progress"

export default function ProgressExample() {
  return (
    <div className="stack">
      <Progress value={64} aria-label="Upload progress" />
      <div className="row ring-demo">
        <ProgressRing value={40}>
          <ProgressValue />
          <ProgressLabel>Import</ProgressLabel>
        </ProgressRing>
        <ProgressRing value={null}>
          <ProgressLabel>Preparing</ProgressLabel>
        </ProgressRing>
      </div>
    </div>
  )
}
