import type { DomainEntityBase, JsonObject, TimestampUtc } from "./common.js";

export const SIGNAL_CANDIDATE_STATUSES = [
  "detected",
  "under_review",
  "evaluated",
  "discarded"
] as const;
export type SignalCandidateStatus = (typeof SIGNAL_CANDIDATE_STATUSES)[number];

export const SIGNAL_EVIDENCE_SOURCES = ["monitor_event", "manual_note", "derived_metric"] as const;
export type SignalEvidenceSource = (typeof SIGNAL_EVIDENCE_SOURCES)[number];

export type SignalEvidence = {
  evidenceId: string;
  source: SignalEvidenceSource;
  description: string;
};

export type SignalCandidate = DomainEntityBase & {
  candidateId: string;
  setupId: string;
  symbolId: string;
  detectedAtUtc: TimestampUtc;
  status: SignalCandidateStatus;
  evidence: SignalEvidence[];
  detectionContext?: JsonObject;
  statusReason?: string;
};
