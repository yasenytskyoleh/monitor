import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";
import type { ResearchDecisionApprovalDurableRecord } from "../storage/research-decision-approval-relational-slice.js";
import type { ResearchFeedbackDecisionDurableRecord } from "../storage/research-feedback-decision-relational-slice.js";
import type { SetupDefinitionRevisionDurableRecord } from "../storage/setup-definition-revision-relational-slice.js";
import type { SetupRefinementRequestDurableRecord } from "../storage/setup-refinement-request-relational-slice.js";
import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError,
  createNotFoundRepositoryError,
  createVersionMismatchRepositoryError
} from "./repository-error.js";
import type {
  SetupDefinitionRevisionRecordWriteRequest,
  SetupDefinitionRevisionRelationalRepositoryAdapter
} from "./setup-definition-revision-relational-repository-adapter.js";

export type SetupDefinitionRevisionRelationalReferenceReader = {
  loadSetupDefinitionRecord(
    setupDefinitionId: string
  ): Promise<SetupDefinitionDurableRecord | null>;
  loadSetupRefinementRequestRecord(
    setupRefinementRequestId: string
  ): Promise<SetupRefinementRequestDurableRecord | null>;
  loadResearchDecisionApprovalRecord(
    researchDecisionApprovalId: string
  ): Promise<ResearchDecisionApprovalDurableRecord | null>;
  loadResearchFeedbackDecisionRecord(
    researchFeedbackDecisionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord | null>;
};

const cloneSetupDefinitionRevisionRecord = (
  record: SetupDefinitionRevisionDurableRecord
): SetupDefinitionRevisionDurableRecord => structuredClone(record);

const compareRevisionVersionAsc = (
  left: SetupDefinitionRevisionDurableRecord,
  right: SetupDefinitionRevisionDurableRecord
): number => left.setupVersionNumber - right.setupVersionNumber;

const assertExpectedVersion = (
  setupDefinitionRevisionId: string,
  currentVersion: number,
  expectedVersion: number | null
): void => {
  if (expectedVersion !== null && expectedVersion !== currentVersion) {
    throw createVersionMismatchRepositoryError({
      entityType: "setup_definition_revision",
      entityId: setupDefinitionRevisionId,
      operation: "update",
      expectedVersion,
      actualVersion: currentVersion
    });
  }
};

export class InMemorySetupDefinitionRevisionRelationalRepositoryAdapter
  implements SetupDefinitionRevisionRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, SetupDefinitionRevisionDurableRecord>();

  constructor(
    private readonly references: SetupDefinitionRevisionRelationalReferenceReader
  ) {}

  async loadSetupDefinitionRevisionRecord(
    setupDefinitionRevisionId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null> {
    const record = this.recordsById.get(setupDefinitionRevisionId);
    return record ? cloneSetupDefinitionRevisionRecord(record) : null;
  }

  async loadSetupDefinitionRevisionRecordBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null> {
    const record = [...this.recordsById.values()].find(
      (entry) => entry.setupDefinitionId === setupDefinitionId
    );
    return record ? cloneSetupDefinitionRevisionRecord(record) : null;
  }

  async loadLatestSetupDefinitionRevisionRecordBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupDefinitionRevisionDurableRecord | null> {
    const records = await this.listSetupDefinitionRevisionRecordsBySetupFamilyId(
      setupFamilyId
    );
    return records.at(-1) ?? null;
  }

  async listSetupDefinitionRevisionRecordsBySetupFamilyId(
    setupFamilyId: string
  ): Promise<SetupDefinitionRevisionDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.setupFamilyId === setupFamilyId)
      .sort(compareRevisionVersionAsc)
      .map((record) => cloneSetupDefinitionRevisionRecord(record));
  }

  async insertSetupDefinitionRevisionRecord(
    request: SetupDefinitionRevisionRecordWriteRequest
  ): Promise<SetupDefinitionRevisionDurableRecord> {
    const setupDefinitionRevisionId = request.record.identity.entityId;
    if (this.recordsById.has(setupDefinitionRevisionId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_definition_revision",
        entityId: setupDefinitionRevisionId,
        operation: "create"
      });
    }

    await this.assertReferencesAndLineage(request.record, "create");

    const record = cloneSetupDefinitionRevisionRecord(request.record);
    this.recordsById.set(setupDefinitionRevisionId, record);
    return cloneSetupDefinitionRevisionRecord(record);
  }

  async updateSetupDefinitionRevisionRecord(
    request: SetupDefinitionRevisionRecordWriteRequest
  ): Promise<SetupDefinitionRevisionDurableRecord> {
    const setupDefinitionRevisionId = request.record.identity.entityId;
    const currentRecord = this.recordsById.get(setupDefinitionRevisionId);
    if (!currentRecord) {
      throw createNotFoundRepositoryError({
        entityType: "setup_definition_revision",
        entityId: setupDefinitionRevisionId,
        operation: "update"
      });
    }

    assertExpectedVersion(
      setupDefinitionRevisionId,
      currentRecord.identity.version,
      request.expectedVersion
    );
    await this.assertReferencesAndLineage(request.record, "update");

    const record = cloneSetupDefinitionRevisionRecord(request.record);
    this.recordsById.set(setupDefinitionRevisionId, record);
    return cloneSetupDefinitionRevisionRecord(record);
  }

  private async assertReferencesAndLineage(
    record: SetupDefinitionRevisionDurableRecord,
    operation: "create" | "update"
  ): Promise<void> {
    await this.assertSetupDefinitionReferenceExists(
      record.identity.entityId,
      record.setupDefinitionId,
      operation
    );
    await this.assertSetupDefinitionReferenceExists(
      record.identity.entityId,
      record.previousSetupDefinitionId,
      operation
    );

    const sourceRequest = await this.assertSetupRefinementRequestReferenceExists(
      record,
      operation
    );
    const approval = await this.assertResearchDecisionApprovalReferenceExists(
      record,
      operation
    );
    const feedbackDecision = await this.assertResearchFeedbackDecisionReferenceExists(
      record,
      operation
    );

    this.assertSourceRequestPreviousSetupMatch(record, sourceRequest, operation);
    this.assertSourceRequestApprovalMatch(record, sourceRequest, operation);
    this.assertSourceRequestFeedbackMatch(record, sourceRequest, operation);
    this.assertApprovalSetupMatch(record, sourceRequest, approval, operation);
    this.assertApprovalFeedbackMatch(record, sourceRequest, approval, operation);
    this.assertFeedbackDecisionSetupMatch(
      record,
      sourceRequest,
      feedbackDecision,
      operation
    );
  }

  private async assertSetupDefinitionReferenceExists(
    setupDefinitionRevisionId: string,
    setupDefinitionId: string | null,
    operation: "create" | "update"
  ): Promise<void> {
    if (!setupDefinitionId) {
      return;
    }

    const setupDefinition = await this.references.loadSetupDefinitionRecord(setupDefinitionId);
    if (!setupDefinition) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: setupDefinitionRevisionId,
        operation,
        referenceEntityType: "setup_definition",
        referenceEntityId: setupDefinitionId
      });
    }
  }

  private async assertSetupRefinementRequestReferenceExists(
    record: SetupDefinitionRevisionDurableRecord,
    operation: "create" | "update"
  ): Promise<SetupRefinementRequestDurableRecord> {
    const sourceRequest = await this.references.loadSetupRefinementRequestRecord(
      record.sourceSetupRefinementRequestId
    );
    if (!sourceRequest) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "setup_refinement_request",
        referenceEntityId: record.sourceSetupRefinementRequestId
      });
    }

    return sourceRequest;
  }

  private async assertResearchDecisionApprovalReferenceExists(
    record: SetupDefinitionRevisionDurableRecord,
    operation: "create" | "update"
  ): Promise<ResearchDecisionApprovalDurableRecord | null> {
    if (!record.sourceResearchDecisionApprovalId) {
      return null;
    }

    const approval = await this.references.loadResearchDecisionApprovalRecord(
      record.sourceResearchDecisionApprovalId
    );
    if (!approval) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "research_decision_approval",
        referenceEntityId: record.sourceResearchDecisionApprovalId
      });
    }

    return approval;
  }

  private async assertResearchFeedbackDecisionReferenceExists(
    record: SetupDefinitionRevisionDurableRecord,
    operation: "create" | "update"
  ): Promise<ResearchFeedbackDecisionDurableRecord | null> {
    if (!record.sourceResearchFeedbackDecisionId) {
      return null;
    }

    const feedbackDecision = await this.references.loadResearchFeedbackDecisionRecord(
      record.sourceResearchFeedbackDecisionId
    );
    if (!feedbackDecision) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: record.sourceResearchFeedbackDecisionId
      });
    }

    return feedbackDecision;
  }

  private assertSourceRequestPreviousSetupMatch(
    record: SetupDefinitionRevisionDurableRecord,
    sourceRequest: SetupRefinementRequestDurableRecord,
    operation: "create" | "update"
  ): void {
    if (
      record.previousSetupDefinitionId &&
      sourceRequest.setupDefinitionId !== record.previousSetupDefinitionId
    ) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "setup_refinement_request",
        referenceEntityId: record.sourceSetupRefinementRequestId
      });
    }
  }

  private assertSourceRequestApprovalMatch(
    record: SetupDefinitionRevisionDurableRecord,
    sourceRequest: SetupRefinementRequestDurableRecord,
    operation: "create" | "update"
  ): void {
    if (
      record.sourceResearchDecisionApprovalId &&
      sourceRequest.sourceResearchDecisionApprovalId !==
        record.sourceResearchDecisionApprovalId
    ) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "setup_refinement_request",
        referenceEntityId: record.sourceSetupRefinementRequestId
      });
    }
  }

  private assertSourceRequestFeedbackMatch(
    record: SetupDefinitionRevisionDurableRecord,
    sourceRequest: SetupRefinementRequestDurableRecord,
    operation: "create" | "update"
  ): void {
    if (
      record.sourceResearchFeedbackDecisionId &&
      sourceRequest.sourceResearchFeedbackDecisionId !==
        record.sourceResearchFeedbackDecisionId
    ) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "setup_refinement_request",
        referenceEntityId: record.sourceSetupRefinementRequestId
      });
    }
  }

  private assertApprovalSetupMatch(
    record: SetupDefinitionRevisionDurableRecord,
    sourceRequest: SetupRefinementRequestDurableRecord,
    approval: ResearchDecisionApprovalDurableRecord | null,
    operation: "create" | "update"
  ): void {
    if (!approval) {
      return;
    }

    if (approval.setupDefinitionId !== sourceRequest.setupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "research_decision_approval",
        referenceEntityId: approval.identity.entityId
      });
    }
  }

  private assertApprovalFeedbackMatch(
    record: SetupDefinitionRevisionDurableRecord,
    sourceRequest: SetupRefinementRequestDurableRecord,
    approval: ResearchDecisionApprovalDurableRecord | null,
    operation: "create" | "update"
  ): void {
    if (!approval) {
      return;
    }

    if (
      approval.researchFeedbackDecisionId !==
      sourceRequest.sourceResearchFeedbackDecisionId
    ) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "research_decision_approval",
        referenceEntityId: approval.identity.entityId
      });
    }
  }

  private assertFeedbackDecisionSetupMatch(
    record: SetupDefinitionRevisionDurableRecord,
    sourceRequest: SetupRefinementRequestDurableRecord,
    feedbackDecision: ResearchFeedbackDecisionDurableRecord | null,
    operation: "create" | "update"
  ): void {
    if (!feedbackDecision) {
      return;
    }

    if (feedbackDecision.setupDefinitionId !== sourceRequest.setupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_definition_revision",
        entityId: record.identity.entityId,
        operation,
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: feedbackDecision.identity.entityId
      });
    }
  }
}
