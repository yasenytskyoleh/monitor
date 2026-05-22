import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";
import type {
  EvaluationResultDurableRecord,
  SignalCandidateDurableRecord
} from "../storage/signal-evaluation-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import type {
  EvaluationResultRecordWriteRequest,
  SignalCandidateRecordWriteRequest,
  SignalEvaluationRelationalRepositoryAdapter
} from "./signal-evaluation-relational-repository-adapter.js";

export type SignalEvaluationRelationalReferenceReader = {
  loadSetupDefinitionRecord(setupDefinitionId: string): Promise<SetupDefinitionDurableRecord | null>;
};

const cloneSignalCandidateRecord = (
  record: SignalCandidateDurableRecord
): SignalCandidateDurableRecord => structuredClone(record);

const cloneEvaluationResultRecord = (
  record: EvaluationResultDurableRecord
): EvaluationResultDurableRecord => structuredClone(record);

const assertExpectedVersion = (
  entityType: "signal_candidate" | "evaluation_result",
  entityId: string,
  currentVersion: number,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== currentVersion) {
    throw createVersionMismatchRepositoryError({
      entityType,
      entityId,
      operation: "update",
      expectedVersion,
      actualVersion: currentVersion
    });
  }
};

export class InMemorySignalEvaluationRelationalRepositoryAdapter
  implements SignalEvaluationRelationalRepositoryAdapter
{
  private readonly signalCandidateRecordsById = new Map<string, SignalCandidateDurableRecord>();
  private readonly evaluationResultRecordsById = new Map<string, EvaluationResultDurableRecord>();

  constructor(private readonly references: SignalEvaluationRelationalReferenceReader) {}

  async loadSignalCandidateRecord(
    signalCandidateId: string
  ): Promise<SignalCandidateDurableRecord | null> {
    const record = this.signalCandidateRecordsById.get(signalCandidateId);
    return record ? cloneSignalCandidateRecord(record) : null;
  }

  async listSignalCandidateRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SignalCandidateDurableRecord[]> {
    return [...this.signalCandidateRecordsById.values()]
      .filter((record) => record.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneSignalCandidateRecord(record));
  }

  async listSignalCandidateRecordsByMonitoredSymbolId(
    monitoredSymbolId: string
  ): Promise<SignalCandidateDurableRecord[]> {
    return [...this.signalCandidateRecordsById.values()]
      .filter((record) => record.monitoredSymbolId === monitoredSymbolId)
      .map((record) => cloneSignalCandidateRecord(record));
  }

  async listSignalCandidateRecordsByStatus(
    statuses: SignalCandidateDurableRecord["candidateStatus"][]
  ): Promise<SignalCandidateDurableRecord[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.signalCandidateRecordsById.values()]
      .filter((record) => allowedStatuses.has(record.candidateStatus))
      .map((record) => cloneSignalCandidateRecord(record));
  }

  async insertSignalCandidateRecord(
    request: SignalCandidateRecordWriteRequest
  ): Promise<SignalCandidateDurableRecord> {
    const signalCandidateId = request.record.identity.entityId;
    if (this.signalCandidateRecordsById.has(signalCandidateId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "signal_candidate",
        entityId: signalCandidateId,
        operation: "create"
      });
    }

    await this.assertSetupDefinitionReferenceExists(request.record, "create");

    const record = cloneSignalCandidateRecord(request.record);
    this.signalCandidateRecordsById.set(signalCandidateId, record);
    return cloneSignalCandidateRecord(record);
  }

  async updateSignalCandidateRecord(
    request: SignalCandidateRecordWriteRequest
  ): Promise<SignalCandidateDurableRecord> {
    const signalCandidateId = request.record.identity.entityId;
    const currentRecord = this.signalCandidateRecordsById.get(signalCandidateId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "signal_candidate",
        entityId: signalCandidateId,
        operation: "update"
      });
    }

    assertExpectedVersion(
      "signal_candidate",
      signalCandidateId,
      currentRecord.identity.version,
      request.expectedVersion
    );
    await this.assertSetupDefinitionReferenceExists(request.record, "update");

    const record = cloneSignalCandidateRecord(request.record);
    this.signalCandidateRecordsById.set(signalCandidateId, record);
    return cloneSignalCandidateRecord(record);
  }

  async loadEvaluationResultRecord(
    evaluationResultId: string
  ): Promise<EvaluationResultDurableRecord | null> {
    const record = this.evaluationResultRecordsById.get(evaluationResultId);
    return record ? cloneEvaluationResultRecord(record) : null;
  }

  async loadEvaluationResultRecordBySignalCandidateAndWindow(
    signalCandidateId: string,
    evaluationWindowId: string
  ): Promise<EvaluationResultDurableRecord | null> {
    for (const record of this.evaluationResultRecordsById.values()) {
      if (
        record.signalCandidateId === signalCandidateId &&
        record.evaluationWindowId === evaluationWindowId
      ) {
        return cloneEvaluationResultRecord(record);
      }
    }

    return null;
  }

  async listEvaluationResultRecordsBySignalCandidateId(
    signalCandidateId: string
  ): Promise<EvaluationResultDurableRecord[]> {
    return [...this.evaluationResultRecordsById.values()]
      .filter((record) => record.signalCandidateId === signalCandidateId)
      .map((record) => cloneEvaluationResultRecord(record));
  }

  async listEvaluationResultRecordsByEvaluationWindowId(
    evaluationWindowId: string
  ): Promise<EvaluationResultDurableRecord[]> {
    return [...this.evaluationResultRecordsById.values()]
      .filter((record) => record.evaluationWindowId === evaluationWindowId)
      .map((record) => cloneEvaluationResultRecord(record));
  }

  async listEvaluationResultRecordsByStatus(
    statuses: EvaluationResultDurableRecord["evaluationStatus"][]
  ): Promise<EvaluationResultDurableRecord[]> {
    const allowedStatuses = new Set(statuses);
    return [...this.evaluationResultRecordsById.values()]
      .filter((record) => allowedStatuses.has(record.evaluationStatus))
      .map((record) => cloneEvaluationResultRecord(record));
  }

  async insertEvaluationResultRecord(
    request: EvaluationResultRecordWriteRequest
  ): Promise<EvaluationResultDurableRecord> {
    const evaluationResultId = request.record.identity.entityId;
    if (this.evaluationResultRecordsById.has(evaluationResultId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "evaluation_result",
        entityId: evaluationResultId,
        operation: "create"
      });
    }

    this.assertSignalCandidateReferenceExists(request.record, "create");
    this.assertEvaluationCandidateWindowPairUnique(request.record, null, "create");

    const record = cloneEvaluationResultRecord(request.record);
    this.evaluationResultRecordsById.set(evaluationResultId, record);
    return cloneEvaluationResultRecord(record);
  }

  async updateEvaluationResultRecord(
    request: EvaluationResultRecordWriteRequest
  ): Promise<EvaluationResultDurableRecord> {
    const evaluationResultId = request.record.identity.entityId;
    const currentRecord = this.evaluationResultRecordsById.get(evaluationResultId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "evaluation_result",
        entityId: evaluationResultId,
        operation: "update"
      });
    }

    assertExpectedVersion(
      "evaluation_result",
      evaluationResultId,
      currentRecord.identity.version,
      request.expectedVersion
    );
    this.assertSignalCandidateReferenceExists(request.record, "update");
    this.assertEvaluationCandidateWindowPairUnique(request.record, evaluationResultId, "update");

    const record = cloneEvaluationResultRecord(request.record);
    this.evaluationResultRecordsById.set(evaluationResultId, record);
    return cloneEvaluationResultRecord(record);
  }

  private async assertSetupDefinitionReferenceExists(
    record: SignalCandidateDurableRecord,
    operation: "create" | "update"
  ): Promise<void> {
    const setupDefinition = await this.references.loadSetupDefinitionRecord(record.setupDefinitionId);
    if (!setupDefinition) {
      throw createInvalidReferenceRepositoryError({
        entityType: "signal_candidate",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "setup_definition",
        referenceEntityId: record.setupDefinitionId
      });
    }
  }

  private assertSignalCandidateReferenceExists(
    record: EvaluationResultDurableRecord,
    operation: "create" | "update"
  ): void {
    if (!this.signalCandidateRecordsById.has(record.signalCandidateId)) {
      throw createInvalidReferenceRepositoryError({
        entityType: "evaluation_result",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "signal_candidate",
        referenceEntityId: record.signalCandidateId
      });
    }
  }

  private assertEvaluationCandidateWindowPairUnique(
    record: EvaluationResultDurableRecord,
    ignoredEvaluationResultId: string | null,
    operation: "create" | "update"
  ): void {
    for (const currentRecord of this.evaluationResultRecordsById.values()) {
      if (
        currentRecord.signalCandidateId === record.signalCandidateId &&
        currentRecord.evaluationWindowId === record.evaluationWindowId &&
        currentRecord.identity.entityId !== ignoredEvaluationResultId
      ) {
        throw createAlreadyExistsRepositoryError({
          entityType: "evaluation_result",
          entityId: record.identity.entityId,
          operation
        });
      }
    }
  }
}
