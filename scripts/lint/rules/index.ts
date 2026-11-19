import type { Rule } from "../core.ts"
import { exampleFrames, internalPrimitives, noDeferredFocus, noHandRolledRoles, noImportant, noOnly, pinUiSdk, relativeImports } from "./code.ts"
import { currentUiSdk, installVersions, statedCounts } from "./facts.ts"
import { landingRecorded, roadmapFresh, roadmapShape, singlePlan } from "./plan.ts"

// Every slip the project catches gets a rule here, with what happened in `why`.
export const rules: Rule[] = [
  singlePlan,
  roadmapShape,
  roadmapFresh,
  landingRecorded,
  noDeferredFocus,
  noHandRolledRoles,
  relativeImports,
  noImportant,
  exampleFrames,
  internalPrimitives,
  pinUiSdk,
  noOnly,
  statedCounts,
  currentUiSdk,
  installVersions,
]
