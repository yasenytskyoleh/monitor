export const REVISION_IMPACT_CLASSIFICATIONS = [
  "improved",
  "degraded",
  "mixed",
  "inconclusive"
] as const;

export type RevisionImpactClassification =
  (typeof REVISION_IMPACT_CLASSIFICATIONS)[number];
