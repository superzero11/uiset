import type { Rule } from "../core.ts"
import { axeWaits, exampleFrames, internalPrimitives, noDeferredFocus, skinScope, noHandRolledRoles, noImportant, noOnly, pinUiSdk, relativeImports } from "./code.ts"
import { currentUiSdk, installVersions, kitInstall, statedCounts, whatsNewCurrent } from "./facts.ts"
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
  skinScope,
  pinUiSdk,
  noOnly,
  axeWaits,
  statedCounts,
  currentUiSdk,
  installVersions,
  whatsNewCurrent,
  kitInstall,
]
