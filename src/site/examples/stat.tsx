import { Stat } from "@/registry/uiset/ui/stat"

export default function StatExample() {
  return (
    <Stat
      label="Monthly revenue"
      value="$48,210"
      change={{ value: "8.2%", direction: "up", period: "vs October" }}
    />
  )
}
