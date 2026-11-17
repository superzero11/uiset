// What the uiset.dev bookmarklet runs, on whatever page it's clicked on. scripts/bookmarklet.mjs
// bundles it into src/site/generated/agent-check-bookmarklet.ts.
import { showAgentReadiness } from "@/registry/uiset/ui/agent-check/overlay"

void showAgentReadiness()
