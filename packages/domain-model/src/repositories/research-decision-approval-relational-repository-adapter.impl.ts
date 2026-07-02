import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError
} from "./repository-error.js";
import type {
  ResearchDecisionApprovalRecordWriteRequest,
  ResearchDecisionApprovalRelationalRepositoryAdapter
} from "./research-decision-approval-relational-repository-adapter.js";
import type { ResearchFeedbackDecisionDurableRecord } from "../storage/research-feedback-decision-relational-slice.js";
import type { ResearchDecisionApprovalDurableRecord } from "../storage/research-decision-approval-relational-slice.js";
import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";

export type ResearchDecisionApprovalRelationalReferenceReader = {
  loadResearchFeedbackDecisionRecord(
    researchFeedbackDecisionId: string
  ): Promise<ResearchFeedbackDecisionDurableRecord | null>;
  loadSetupDefinitionRecord(
    setupDefinitionId: string
  ): Promise<SetupDefinitionDurableRecord | null>;
};

const cloneResearchDecisionApprovalRecord = (
  record: ResearchDecisionApprovalDurableRecord
): ResearchDecisionApprovalDurableRecord => structuredClone(record);

export class InMemoryResearchDecisionApprovalRelationalRepositoryAdapter
  implements ResearchDecisionApprovalRelationalRepositoryAdapter
{
  private readonly recordsById = new Map<string, ResearchDecisionApprovalDurableRecord>();

  constructor(private readonly references: ResearchDecisionApprovalRelationalReferenceReader) {}

  async loadResearchDecisionApprovalRecord(
    researchDecisionApprovalId: string
  ): Promise<ResearchDecisionApprovalDurableRecord | null> {
    const record = this.recordsById.get(researchDecisionApprovalId);
    return record ? cloneResearchDecisionApprovalRecord(record) : null;
  }

  async listResearchDecisionApprovalRecordsByResearchFeedbackDecisionId(
    researchFeedbackDecisionId: string
  ): Promise<ResearchDecisionApprovalDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.researchFeedbackDecisionId === researchFeedbackDecisionId)
      .map((record) => cloneResearchDecisionApprovalRecord(record));
  }

  async insertResearchDecisionApprovalRecord(
    request: ResearchDecisionApprovalRecordWriteRequest
  ): Promise<ResearchDecisionApprovalDurableRecord> {
    const researchDecisionApprovalId = request.record.identity.entityId;
    if (this.recordsById.has(researchDecisionApprovalId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "research_decision_approval",
        entityId: researchDecisionApprovalId,
        operation: "create"
      });
    }

    const feedbackDecision = await this.assertResearchFeedbackDecisionReferenceExists(
      request.record
    );
    await this.assertSetupDefinitionReferenceExists(request.record);
    this.assertResearchFeedbackDecisionSetupMatch(request.record, feedbackDecision);

    const record = cloneResearchDecisionApprovalRecord(request.record);
    this.recordsById.set(researchDecisionApprovalId, record);
    return cloneResearchDecisionApprovalRecord(record);
  }

  private async assertResearchFeedbackDecisionReferenceExists(
    record: ResearchDecisionApprovalDurableRecord
  ): Promise<ResearchFeedbackDecisionDurableRecord> {
    const feedbackDecision = await this.references.loadResearchFeedbackDecisionRecord(
      record.researchFeedbackDecisionId
    );
    if (!feedbackDecision) {
      throw createInvalidReferenceRepositoryError({
        entityType: "research_decision_approval",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: record.researchFeedbackDecisionId
      });
    }

    return feedbackDecision;
  }

  private async assertSetupDefinitionReferenceExists(
    record: ResearchDecisionApprovalDurableRecord
  ): Promise<void> {
    const setupDefinition = await this.references.loadSetupDefinitionRecord(record.setupDefinitionId);
    if (!setupDefinition) {
      throw createInvalidReferenceRepositoryError({
        entityType: "research_decision_approval",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition",
        referenceEntityId: record.setupDefinitionId
      });
    }
  }

  private assertResearchFeedbackDecisionSetupMatch(
    record: ResearchDecisionApprovalDurableRecord,
    feedbackDecision: ResearchFeedbackDecisionDurableRecord
  ): void {
    if (feedbackDecision.setupDefinitionId !== record.setupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "research_decision_approval",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: record.researchFeedbackDecisionId
      });
    }
  }
}
