import type { DomainEntityBase, JsonObject } from "../common.js";
import type { NormalizedEventType } from "../monitoring/normalized-event.js";

export type EvaluationObservationReference = {
  sourceId: string | null;
  expectedEventTypes: NormalizedEventType[];
  note?: string;
};

export type EvaluationContext = {
  contextLabel: string | null;
  limitations: string[];
  metadata?: JsonObject;
};

export type EvaluationInput = DomainEntityBase & {
  inputId: string;
  signalCandidateId: string;
  evaluationWindowId: string;
  observationReferences: EvaluationObservationReference[];
  context?: EvaluationContext;
};
