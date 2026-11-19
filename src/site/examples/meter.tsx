import { Meter, MeterLabel, MeterRing, MeterValue } from "@/registry/uiset/ui/meter"

export default function MeterExample() {
  return (
    <div className="stack">
      <Meter value={72} aria-label="Storage used" />
      <div className="row ring-demo">
        <MeterRing value={62}>
          <MeterValue />
          <MeterLabel>Reading goal</MeterLabel>
        </MeterRing>
        <MeterRing value={18}>
          <MeterValue />
          <MeterLabel>Seats used</MeterLabel>
        </MeterRing>
      </div>
    </div>
  )
}
