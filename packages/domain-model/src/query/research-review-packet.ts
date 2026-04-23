import type { TimestampUtc } from "../common.js";
import type { ResearchHypothesis } from "../research-hypothesis.js";
import type { ResearchFeedbackDecision } from "../research/research-feedback-decision.js";
import type { SetupDefinition } from "../setup-definition.js";
import type { ResearchDecisionApproval } from "../review/research-decision-approval.js";
import type { SetupDefinitionRevisionStatus } from "../review/setup-definition-revision.js";
import type { RevisionComparisonScopeDescriptor } from "./compare-setup-revisions-command.js";
import type { ResearchReviewPacketStatus } from "./research-review-packet-status.js";
import type { SetupRevisionImpactSummary } from "./setup-revision-impact-summary.js";

export type ResearchReviewPacketArtifactRefs = {
  setupRevisionId?: string;
  setupDefinitionId?: string;
  researchHypothesisId?: string;
  researchFeedbackDecisionId?: string;
  researchDecisionApprovalId?: string;
  impactSummaryId?: string;
};

export type ResearchReviewPacketRevisionContext = {
  setupRevisionId: string;
  setupDefinitionId: string;
  revisionStatus: SetupDefinitionRevisionStatus;
  setupDefinitionStatus?: SetupDefinition["status"] | "missing_setup_definition";
  version: number;
  previousRevisionId?: string;
};

export type ResearchReviewPacket = {
  id: string;
  setupFamilyId: string;
  setupRevisionId?: string;
  hypothesisId?: string;
  reviewScope?: RevisionComparisonScopeDescriptor;
  revisionContext?: ResearchReviewPacketRevisionContext;
  impactSummarySnapshot?: SetupRevisionImpactSummary;
  hypothesisSnapshot?: ResearchHypothesis;
  recommendationSnapshot?: ResearchFeedbackDecision;
  approvalSnapshot?: ResearchDecisionApproval;
  includedArtifactRefs: ResearchReviewPacketArtifactRefs;
  requestedArtifactRefs?: ResearchReviewPacketArtifactRefs;
  currentEvidenceStatus?: ResearchHypothesis["evidenceStatus"];
  warnings: string[];
  status: ResearchReviewPacketStatus;
  createdAt: TimestampUtc;
};
