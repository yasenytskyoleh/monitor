import type { ResearchReviewPacket } from "./research-review-packet.js";

export const RESEARCH_REVIEW_PACKET_RESULT_STATUSES = [
  "complete",
  "partial",
  "insufficient_context",
  "rejected",
  "failed"
] as const;

export type ResearchReviewPacketResultStatus =
  (typeof RESEARCH_REVIEW_PACKET_RESULT_STATUSES)[number];

export type ResearchReviewPacketResult = {
  status: ResearchReviewPacketResultStatus;
  packet?: ResearchReviewPacket;
  setupFamilyId?: string;
  setupRevisionId?: string;
  researchHypothesisId?: string;
  researchFeedbackDecisionId?: string;
  researchDecisionApprovalId?: string;
  reason?: string;
  warnings: string[];
};
