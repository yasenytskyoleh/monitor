import type { ResearchHypothesisDurableRecordBundle } from "./first-durable-relational-repository-adapter.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import type {
  ResearchFeedbackDecisionRecordWriteRequest,
  ResearchFeedbackDecisionRelationalRepositoryAdapter
} from "./research-feedback-decision-relational-repository-adapter.js";
import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";
import type { ResearchFeedbackDecisionDurableRecord } from "../storage/research-feedback-decision-relational-slice.js";
import type { SetupAggregateResultDurableRecord } from "../storage/setup-aggregate-relational-slice.js";

export type ResearchFeedbackDecisionRelationalReferenceReader = {
  loadSetupDefinitionRecord(setupDefinitionId: string): Promise<SetupDefinitionDurableRecord | null>;
  loadResearchHypothesisBundle(
    researchHypothesisId: string
  ): Promise<ResearchHypothesisDurableRecordBundle | null>;
  loadSetupAggregateResultRecord(
    setupAggregateResultId: string
  ): Promise<SetupAggregateResultDurableRecord | null>;
};

const cloneResearchFeedbackDecisionRecord = (
  record: ResearchFeedbackDecisionDurableRecord
): ResearchFeedbackDecisionDurableRecord => structuredClone(record);

const assertExpectedVersion = (
  researchFeedbackDecisionId: string,
  currentVersion: number,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== currentVersion) {
    throw createVersionMismatchRepositoryError({
      entityType: "research_feedback_decision",
      entityId: researchFeedbackDecisionId,
      operation: "update",
      expectedVersion,
      actualVersion: currentVersion
    });
  }
};

export class InMemoryResearchFeedbackDecisionRelationalRepositoryAdapter
  implements ResearchFeedbackDecisionRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, ResearchFeedbackDecisionDurableRecord>();

  constructor(private readonly references: ResearchFeedbackDecisionRelationalReferenceReader) {}

  async loadResearchFeedbackDecisionRecord(
    researchFeedbackDecisionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord | null> {
    const record = this.recordsById.get(researchFeedbackDecisionId);
    return record ? cloneResearchFeedbackDecisionRecord(record) : null;
  }

  async listResearchFeedbackDecisionRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneResearchFeedbackDecisionRecord(record));
  }

  async listResearchFeedbackDecisionRecordsByResearchHypothesisId(
    researchHypothesisId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.researchHypothesisId === researchHypothesisId)
      .map((record) => cloneResearchFeedbackDecisionRecord(record));
  }

  async insertResearchFeedbackDecisionRecord(
    request: ResearchFeedbackDecisionRecordWriteRequest
  ): Promise<ResearchFeedbackDecisionDurableRecord> {
    const researchFeedbackDecisionId = request.record.identity.entityId;
    if (this.recordsById.has(researchFeedbackDecisionId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "research_feedback_decision",
        entityId: researchFeedbackDecisionId,
        operation: "create"
      });
    }

    await this.assertSetupDefinitionReferenceExists(request.record, "create");
    await this.assertResearchHypothesisReferenceExists(request.record, "create");
    await this.assertSetupAggregateResultReferenceExists(request.record, "create");

    const record = cloneResearchFeedbackDecisionRecord(request.record);
    this.recordsById.set(researchFeedbackDecisionId, record);
    return cloneResearchFeedbackDecisionRecord(record);
  }

  async updateResearchFeedbackDecisionRecord(
    request: ResearchFeedbackDecisionRecordWriteRequest
  ): Promise<ResearchFeedbackDecisionDurableRecord> {
    const researchFeedbackDecisionId = request.record.identity.entityId;
    const currentRecord = this.recordsById.get(researchFeedbackDecisionId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "research_feedback_decision",
        entityId: researchFeedbackDecisionId,
        operation: "update"
      });
    }

    assertExpectedVersion(
      researchFeedbackDecisionId,
      currentRecord.identity.version,
      request.expectedVersion
    );
    await this.assertSetupDefinitionReferenceExists(request.record, "update");
    await this.assertResearchHypothesisReferenceExists(request.record, "update");
    await this.assertSetupAggregateResultReferenceExists(request.record, "update");

    const record = cloneResearchFeedbackDecisionRecord(request.record);
    this.recordsById.set(researchFeedbackDecisionId, record);
    return cloneResearchFeedbackDecisionRecord(record);
  }

  private async assertSetupDefinitionReferenceExists(
    record: ResearchFeedbackDecisionDurableRecord,
    operation: "create" | "update"
  ): Promise<void> {
    const setupDefinition = await this.references.loadSetupDefinitionRecord(record.setupDefinitionId);
    if (!setupDefinition) {
      throw createInvalidReferenceRepositoryError({
        entityType: "research_feedback_decision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "setup_definition",
        referenceEntityId: record.setupDefinitionId
      });
    }
  }

  private async assertResearchHypothesisReferenceExists(
    record: ResearchFeedbackDecisionDurableRecord,
    operation: "create" | "update"
  ): Promise<void> {
    const hypothesis = await this.references.loadResearchHypothesisBundle(record.researchHypothesisId);
    if (!hypothesis) {
      throw createInvalidReferenceRepositoryError({
        entityType: "research_feedback_decision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "research_hypothesis",
        referenceEntityId: record.researchHypothesisId
      });
    }
  }

  private async assertSetupAggregateResultReferenceExists(
    record: ResearchFeedbackDecisionDurableRecord,
    operation: "create" | "update"
  ): Promise<void> {
    if (!record.setupAggregateResultId) {
      return;
    }

    const aggregate = await this.references.loadSetupAggregateResultRecord(
      record.setupAggregateResultId
    );
    if (!aggregate) {
      throw createInvalidReferenceRepositoryError({
        entityType: "research_feedback_decision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "setup_aggregate_result",
        referenceEntityId: record.setupAggregateResultId
      });
    }
  }
}
