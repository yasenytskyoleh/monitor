import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError
} from "./repository-error.js";
import type {
  SetupLifecycleMutationRecordRecordWriteRequest,
  SetupLifecycleMutationRecordRelationalRepositoryAdapter
} from "./setup-lifecycle-mutation-record-relational-repository-adapter.js";
import type { ResearchDecisionApprovalDurableRecord } from "../storage/research-decision-approval-relational-slice.js";
import type { ResearchFeedbackDecisionDurableRecord } from "../storage/research-feedback-decision-relational-slice.js";
import type { SetupLifecycleMutationRecordDurableRecord } from "../storage/setup-lifecycle-mutation-record-relational-slice.js";
import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";

export type SetupLifecycleMutationRecordRelationalReferenceReader = {
  loadSetupDefinitionRecord(
    setupDefinitionId: string
  ): Promise<SetupDefinitionDurableRecord | null>;
  loadResearchDecisionApprovalRecord(
    researchDecisionApprovalId: string
  ): Promise<ResearchDecisionApprovalDurableRecord | null>;
  loadResearchFeedbackDecisionRecord(
    researchFeedbackDecisionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord | null>;
};

const cloneSetupLifecycleMutationRecord = (
  record: SetupLifecycleMutationRecordDurableRecord
): SetupLifecycleMutationRecordDurableRecord => structuredClone(record);

export class InMemorySetupLifecycleMutationRecordRelationalRepositoryAdapter
  implements SetupLifecycleMutationRecordRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, SetupLifecycleMutationRecordDurableRecord>();

  constructor(
    private readonly references: SetupLifecycleMutationRecordRelationalReferenceReader
  ) {}

  async loadSetupLifecycleMutationRecord(
    setupLifecycleMutationRecordId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord | null> {
    const record = this.recordsById.get(setupLifecycleMutationRecordId);
    return record ? cloneSetupLifecycleMutationRecord(record) : null;
  }

  async listSetupLifecycleMutationRecordsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneSetupLifecycleMutationRecord(record));
  }

  async listSetupLifecycleMutationRecordsByResearchDecisionApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupLifecycleMutationRecordDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.researchDecisionApprovalId === researchDecisionApprovalId)
      .map((record) => cloneSetupLifecycleMutationRecord(record));
  }

  async insertSetupLifecycleMutationRecord(
    request: SetupLifecycleMutationRecordRecordWriteRequest
  ): Promise<SetupLifecycleMutationRecordDurableRecord> {
    const setupLifecycleMutationRecordId = request.record.identity.entityId;
    if (this.recordsById.has(setupLifecycleMutationRecordId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_lifecycle_mutation_record",
        entityId: setupLifecycleMutationRecordId,
        operation: "create"
      });
    }

    const approval = await this.assertResearchDecisionApprovalReferenceExists(request.record);
    const feedbackDecision = await this.assertResearchFeedbackDecisionReferenceExists(request.record);
    await this.assertSetupDefinitionReferenceExists(request.record);
    this.assertApprovalSetupMatch(request.record, approval);
    this.assertApprovalFeedbackMatch(request.record, approval);
    this.assertFeedbackDecisionSetupMatch(request.record, feedbackDecision);

    const record = cloneSetupLifecycleMutationRecord(request.record);
    this.recordsById.set(setupLifecycleMutationRecordId, record);
    return cloneSetupLifecycleMutationRecord(record);
  }

  private async assertResearchDecisionApprovalReferenceExists(
    record: SetupLifecycleMutationRecordDurableRecord
  ): Promise<ResearchDecisionApprovalDurableRecord> {
    const approval = await this.references.loadResearchDecisionApprovalRecord(
      record.researchDecisionApprovalId
    );
    if (!approval) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_lifecycle_mutation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_decision_approval",
        referenceEntityId: record.researchDecisionApprovalId
      });
    }

    return approval;
  }

  private async assertResearchFeedbackDecisionReferenceExists(
    record: SetupLifecycleMutationRecordDurableRecord
  ): Promise<ResearchFeedbackDecisionDurableRecord> {
    const feedbackDecision = await this.references.loadResearchFeedbackDecisionRecord(
      record.researchFeedbackDecisionId
    );
    if (!feedbackDecision) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_lifecycle_mutation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: record.researchFeedbackDecisionId
      });
    }

    return feedbackDecision;
  }

  private async assertSetupDefinitionReferenceExists(
    record: SetupLifecycleMutationRecordDurableRecord
  ): Promise<void> {
    const setupDefinition = await this.references.loadSetupDefinitionRecord(record.setupDefinitionId);
    if (!setupDefinition) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_lifecycle_mutation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition",
        referenceEntityId: record.setupDefinitionId
      });
    }
  }

  private assertApprovalSetupMatch(
    record: SetupLifecycleMutationRecordDurableRecord,
    approval: ResearchDecisionApprovalDurableRecord
  ): void {
    if (approval.setupDefinitionId !== record.setupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_lifecycle_mutation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_decision_approval",
        referenceEntityId: record.researchDecisionApprovalId
      });
    }
  }

  private assertApprovalFeedbackMatch(
    record: SetupLifecycleMutationRecordDurableRecord,
    approval: ResearchDecisionApprovalDurableRecord
  ): void {
    if (approval.researchFeedbackDecisionId !== record.researchFeedbackDecisionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_lifecycle_mutation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_decision_approval",
        referenceEntityId: record.researchDecisionApprovalId
      });
    }
  }

  private assertFeedbackDecisionSetupMatch(
    record: SetupLifecycleMutationRecordDurableRecord,
    feedbackDecision: ResearchFeedbackDecisionDurableRecord
  ): void {
    if (feedbackDecision.setupDefinitionId !== record.setupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_lifecycle_mutation_record",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: record.researchFeedbackDecisionId
      });
    }
  }
}
