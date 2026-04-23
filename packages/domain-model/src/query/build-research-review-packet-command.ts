import type { TimestampUtc } from "../common.js";
import type { RevisionComparisonScopeDescriptor } from "./compare-setup-revisions-command.js";
import type { SetupRevisionImpactSummary } from "./setup-revision-impact-summary.js";

export type BuildResearchReviewPacketCommand = {
  setupFamilyId: string;
  setupRevisionId?: string;
  researchHypothesisId?: string;
  researchFeedbackDecisionId?: string;
  researchDecisionApprovalId?: string;
  impactSummaryId?: string;
  impactSummarySnapshot?: SetupRevisionImpactSummary;
  builtAt: TimestampUtc;
  scopeDescriptor?: RevisionComparisonScopeDescriptor;
  originRunId?: string;
};
