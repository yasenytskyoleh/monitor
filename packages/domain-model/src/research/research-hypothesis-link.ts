import type { DomainEntityBase, TimestampUtc } from "../common.js";

export const HYPOTHESIS_EVIDENCE_STATUSES = ["supports", "weakens", "inconclusive"] as const;
export type HypothesisEvidenceStatus = (typeof HYPOTHESIS_EVIDENCE_STATUSES)[number];

export type ResearchHypothesisEvidenceLink = DomainEntityBase & {
  linkId: string;
  hypothesisId: string;
  aggregateResultId: string;
  evidenceStatus: HypothesisEvidenceStatus;
  assessedAtUtc: TimestampUtc;
  rationale: string;
  limitations: string[];
  notes?: string;
};
