import { Meter, MeterLabel, MeterRing, MeterValue } from "../../src/meter"

export default function MeterExample() {
  return (
    <div class="stack">
      <Meter value={72} aria-label="Storage used" />
      <div class="row ring-demo">
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
