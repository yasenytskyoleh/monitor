import type {
  CandleClosedEvent,
  EvaluationResultRepository,
  EvaluationService,
  EvaluationTriggerResult,
  ProductRecordMetadata,
  SignalCandidateEvaluationTrigger,
  SignalCandidateRepository,
  SignalCandidateService
} from "@monitor/domain-model";

export const CANDLE_EVALUATION_TIMEFRAME = "5m" as const;
export const CANDLE_EVALUATION_WINDOW_ID = "window-24h" as const;
export const CANDLE_EVALUATION_WINDOW_MS = 24 * 60 * 60 * 1_000;
export const CANDLE_EVALUATION_OBSERVATION_COUNT = 288;

export type ClosedCandleEvaluationRequest = {
  signalCandidateId: string;
  detectionCandle: CandleClosedEvent;
  observationCandles: CandleClosedEvent[];
};

export type CandidateEvaluationHandoff = {
  trigger(
    payload: SignalCandidateEvaluationTrigger,
    metadata: ProductRecordMetadata
  ): Promise<EvaluationTriggerResult>;
};

export type ClosedCandleEvaluationRuntimeOptions = {
  candidateRepository: Pick<SignalCandidateRepository, "getById">;
  evaluationResultRepository: Pick<EvaluationResultRepository, "getBySignalCandidateAndWindow">;
  candidateHandoff: CandidateEvaluationHandoff;
  evaluationService: Pick<EvaluationService, "finalizeEvaluationResult">;
  signalCandidateService: Pick<SignalCandidateService, "updateSignalCandidateStatus">;
};

export type ClosedCandleEvaluationStatus =
  | "completed"
  | "rejected_validation"
  | "rejected_lifecycle"
  | "rejected_duplicate"
  | "failed";

export type ClosedCandleEvaluationOutcome = {
  status: ClosedCandleEvaluationStatus;
  evaluationResultId?: string;
  reason?: string;
  warnings: string[];
};

export type ClosedCandleEvaluationRuntime = {
  evaluate(request: ClosedCandleEvaluationRequest): Promise<ClosedCandleEvaluationOutcome>;
};
