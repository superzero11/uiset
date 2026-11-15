import { useState } from "react"
import { Button } from "@/registry/uiset/ui/button"
import { Loading, Skeleton, SkeletonText } from "@/registry/uiset/ui/skeleton"

export default function SkeletonExample() {
  const [loading, setLoading] = useState(true)
  return (
    <div className="stack">
      <Loading loading={loading} label="Loading the team…">
        {loading ? (
          <div className="skeleton-row">
            <Skeleton width="2.5rem" height="2.5rem" radius="50%" />
            <SkeletonText lines={2} />
          </div>
        ) : (
          <p className="example-note">Ada Lovelace, Grace Hopper and 4 more.</p>
        )}
      </Loading>
      <Button variant="outline" onClick={() => setLoading((v) => !v)}>
        {loading ? "Finish loading" : "Load again"}
      </Button>
    </div>
  )
}
