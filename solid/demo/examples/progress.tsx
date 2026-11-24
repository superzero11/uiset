import { Progress, ProgressLabel, ProgressRing, ProgressValue } from "../../src/progress"

export default function ProgressExample() {
  return (
    <div class="stack">
      <Progress value={64} aria-label="Upload progress" />
      <div class="row ring-demo">
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
