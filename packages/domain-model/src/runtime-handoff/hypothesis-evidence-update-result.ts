import type { HypothesisEvidenceStatus } from "../research/research-hypothesis-link.js";

export const HYPOTHESIS_EVIDENCE_UPDATE_STATUSES = [
  "updated",
  "rejected_validation",
  "rejected_lifecycle",
  "rejected_linkage",
  "failed"
] as const;
export type HypothesisEvidenceUpdateStatus =
  (typeof HYPOTHESIS_EVIDENCE_UPDATE_STATUSES)[number];

export type HypothesisEvidenceUpdateResult = {
  status: HypothesisEvidenceUpdateStatus;
  researchHypothesisId?: string;
  setupAggregateResultId?: string;
  evidenceStatus?: HypothesisEvidenceStatus;
  evidenceSummary?: string;
  reason?: string;
  warnings: string[];
};
