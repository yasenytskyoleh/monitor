import type {
  ExecutionAttemptAudit,
  ExecutionAttemptRuntime,
  ExecutionAttemptRuntimeResult,
  ProductRecordMetadata,
  RoutedActionExecutionEnvelopeRepository,
} from "@monitor/domain-model";

export type ExecutePreparedEnvelopeRequest = {
  routedActionExecutionEnvelopeId: string;
  attemptId: string;
  attemptedBy: string;
  attemptedAt: string;
  originRunId?: string;
};

export type ExecutionAttemptRuntimeOptions = {
  routedActionExecutionEnvelopeRepository: Pick<RoutedActionExecutionEnvelopeRepository, "getById">;
  executionAttemptRuntime: Pick<ExecutionAttemptRuntime, "execute">;
};

export type ExecutePreparedEnvelopeResult =
  | ExecutionAttemptRuntimeResult
  | {
      status: "rejected_validation" | "failed";
      reason: string;
      warnings: string[];
    };

export const createPreparedEnvelopeExecutionRuntime = (options: ExecutionAttemptRuntimeOptions) => ({
  async execute(request: ExecutePreparedEnvelopeRequest): Promise<ExecutePreparedEnvelopeResult> {
    if (!isValidRequest(request)) {
      return rejected("envelope, attempt, operator, and valid attempt timestamp are required");
    }

    try {
      const envelope = await options.routedActionExecutionEnvelopeRepository.getById(
        request.routedActionExecutionEnvelopeId,
      );
      if (!envelope) {
        return rejected(`routed_action_execution_envelope not found: ${request.routedActionExecutionEnvelopeId}`);
      }
      if (envelope.executionStatus !== "prepared") {
        return rejected(`routed_action_execution_envelope is not prepared: ${envelope.executionStatus}`);
      }

      return await options.executionAttemptRuntime.execute({
        audit: buildAudit(envelope, request),
        envelope,
        metadata: buildMetadata(envelope.id, request),
      });
    } catch (error: unknown) {
      return {
        status: "failed",
        reason: error instanceof Error ? error.message : "unexpected execution attempt runtime failure",
        warnings: ["execution attempt can be retried after resolving runtime failure"],
      };
    }
  },
});

const rejected = (reason: string): ExecutePreparedEnvelopeResult => ({
  status: "rejected_validation",
  reason,
  warnings: [],
});

const buildAudit = (
  envelope: Awaited<ReturnType<RoutedActionExecutionEnvelopeRepository["getById"]>>,
  request: ExecutePreparedEnvelopeRequest,
): ExecutionAttemptAudit => {
  if (!envelope) {
    throw new Error("prepared envelope is required");
  }

  return {
    attemptId: request.attemptId,
    routedActionExecutionEnvelopeId: envelope.id,
    reviewDecisionRoutingResultId: envelope.sourceRoutingResultId,
    researchReviewDecisionId: envelope.sourceReviewDecisionId,
    actionTarget: envelope.actionTarget,
    downstreamCommandType: envelope.actionCommandType,
    status: "received",
    attemptedBy: request.attemptedBy,
    attemptedAt: request.attemptedAt,
    warningCodes: [],
    createdAtUtc: request.attemptedAt,
    updatedAtUtc: request.attemptedAt,
  };
};

const buildMetadata = (
  envelopeId: string,
  request: ExecutePreparedEnvelopeRequest,
): ProductRecordMetadata => ({
  originRunId: request.originRunId ?? null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: envelopeId,
  sourceObservedAtUtc: request.attemptedAt,
  notes: `execution attempt: envelope=${envelopeId}`,
});

const isValidRequest = (request: ExecutePreparedEnvelopeRequest): boolean =>
  Boolean(
    request.routedActionExecutionEnvelopeId.trim() &&
      request.attemptId.trim() &&
      request.attemptedBy.trim() &&
      request.attemptedAt.trim() &&
      Number.isFinite(Date.parse(request.attemptedAt)),
  );
