export const RESEARCH_REVIEW_PACKET_STATUSES = [
  "complete",
  "partial",
  "insufficient_context",
  "failed"
] as const;

export type ResearchReviewPacketStatus =
  (typeof RESEARCH_REVIEW_PACKET_STATUSES)[number];
