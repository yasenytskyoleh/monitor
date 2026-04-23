import type { TimestampUtc } from "../common.js";
import type { SetupDefinitionStatus } from "../setup-definition.js";
import type { SetupDefinitionRevisionStatus } from "../review/setup-definition-revision.js";
import type { SetupRevisionActivationOutcome } from "../review/setup-revision-activation-status.js";
import type { RuntimeSetupRevisionRef } from "./runtime-setup-revision-ref.js";

export type ActiveSetupRevisionResolution = {
  resolvedAt: TimestampUtc;
  revisionRef: RuntimeSetupRevisionRef;
  effectiveStatus: SetupDefinitionStatus;
  revisionStatus: SetupDefinitionRevisionStatus;
  activationMetadata?: {
    setupRevisionActivationRecordId: string;
    activationOutcome: SetupRevisionActivationOutcome;
    activatedAt: TimestampUtc;
  };
};
