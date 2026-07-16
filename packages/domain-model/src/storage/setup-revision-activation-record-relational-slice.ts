import type { SetupRevisionActivationOutcome } from "../review/setup-revision-activation-status.js";
import type { DurableRelationalRecordBase } from "./first-durable-relational-slice.js";

export const SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ENTITY_TYPES = [
  "setup_revision_activation_record"
] as const;
export type SetupRevisionActivationRecordRelationalEntityType =
  (typeof SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_ENTITY_TYPES)[number];

export type SetupRevisionActivationRecordDurableRecord =
  DurableRelationalRecordBase<"setup_revision_activation_record"> & {
    setupFamilyId: string;
    targetRevisionId: string;
    targetSetupDefinitionId: string;
    previousRevisionId: string | null;
    previousSetupDefinitionId: string | null;
    activatedBy: string;
    activatedAtUtc: string;
    activationOutcome: Exclude<SetupRevisionActivationOutcome, "rejected">;
    rationale: string | null;
  };
