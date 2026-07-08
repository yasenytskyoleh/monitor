import type { ApprovedSetupLifecycleAction } from "../review/setup-lifecycle-action.js";
import type { SetupDefinitionStatus } from "../setup-definition.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ENTITY_TYPES = [
  "setup_lifecycle_mutation_record"
] as const;
export type SetupLifecycleMutationRecordRelationalEntityType =
  (typeof SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_ENTITY_TYPES)[number];

export type SetupLifecycleMutationRecordDurableRecord =
  DurableRelationalRecordBase<"setup_lifecycle_mutation_record"> & {
    setupDefinitionId: string;
    researchDecisionApprovalId: string;
    researchFeedbackDecisionId: string;
    previousStatus: SetupDefinitionStatus;
    newStatus: SetupDefinitionStatus;
    approvedAction: ApprovedSetupLifecycleAction;
    mutatedBy: string;
    mutatedAtUtc: string;
    notes: string | null;
  };
