import { createSignal, Show } from "solid-js"
import { Button } from "../../src/button"
import { Loading, Skeleton, SkeletonText } from "../../src/skeleton"

export default function SkeletonExample() {
  const [loading, setLoading] = createSignal(true)
  return (
    <div class="stack">
      <Loading loading={loading()} label="Loading the team…">
        <Show when={loading()} fallback={<p class="example-note">Ada Lovelace, Grace Hopper and 4 more.</p>}>
          <div class="skeleton-row">
            <Skeleton width="2.5rem" height="2.5rem" radius="50%" />
            <SkeletonText lines={2} />
          </div>
        </Show>
      </Loading>
      <Button variant="outline" onClick={() => setLoading((v) => !v)}>
        {loading() ? "Finish loading" : "Load again"}
      </Button>
    </div>
  )
}
