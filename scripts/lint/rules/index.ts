import type { Rule } from "../core.ts"
import { axeWaits, exampleFrames, hooksAtTopLevel, internalPrimitives, noDeferredFocus, skinScope, noHandRolledRoles, noImportant, noOnly, pinUiSdk, relativeImports, toastsVisible } from "./code.ts"
import { currentUiSdk, installVersions, kitInstall, kitLive, statedCounts, whatsNewCurrent } from "./facts.ts"
import { landingRecorded, roadmapFresh, roadmapShape, singlePlan } from "./plan.ts"

// Every slip the project catches gets a rule here, with what happened in `why`.
export const rules: Rule[] = [
  singlePlan,
  roadmapShape,
  roadmapFresh,
  landingRecorded,
  noDeferredFocus,
  hooksAtTopLevel,
  noHandRolledRoles,
  relativeImports,
  noImportant,
  exampleFrames,
  internalPrimitives,
  skinScope,
  pinUiSdk,
  noOnly,
  toastsVisible,
  axeWaits,
  statedCounts,
  currentUiSdk,
  installVersions,
  whatsNewCurrent,
  kitInstall,
  kitLive,
]
