import {
  createAlreadyExistsRepositoryError,
  createInvalidReferenceRepositoryError
} from "./repository-error.js";
import type {
  SetupRefinementRequestRecordWriteRequest,
  SetupRefinementRequestRelationalRepositoryAdapter
} from "./setup-refinement-request-relational-repository-adapter.js";
import type { ResearchDecisionApprovalDurableRecord } from "../storage/research-decision-approval-relational-slice.js";
import type { ResearchFeedbackDecisionDurableRecord } from "../storage/research-feedback-decision-relational-slice.js";
import type { SetupRefinementRequestDurableRecord } from "../storage/setup-refinement-request-relational-slice.js";
import type { SetupDefinitionDurableRecord } from "../storage/first-durable-relational-slice.js";

export type SetupRefinementRequestRelationalReferenceReader = {
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

const cloneSetupRefinementRequest = (
  record: SetupRefinementRequestDurableRecord
): SetupRefinementRequestDurableRecord => structuredClone(record);

export class InMemorySetupRefinementRequestRelationalRepositoryAdapter
implements SetupRefinementRequestRelationalRepositoryAdapter {
  private readonly recordsById = new Map<string, SetupRefinementRequestDurableRecord>();

  constructor(
    private readonly references: SetupRefinementRequestRelationalReferenceReader
  ) {}

  async loadSetupRefinementRequest(
    setupRefinementRequestId: string
  ): Promise<SetupRefinementRequestDurableRecord | null> {
    const record = this.recordsById.get(setupRefinementRequestId);
    return record ? cloneSetupRefinementRequest(record) : null;
  }

  async listSetupRefinementRequestsBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupRefinementRequestDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter((record) => record.setupDefinitionId === setupDefinitionId)
      .map((record) => cloneSetupRefinementRequest(record));
  }

  async listSetupRefinementRequestsByResearchDecisionApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupRefinementRequestDurableRecord[]> {
    return [...this.recordsById.values()]
      .filter(
        (record) =>
          record.sourceResearchDecisionApprovalId === researchDecisionApprovalId
      )
      .map((record) => cloneSetupRefinementRequest(record));
  }

  async insertSetupRefinementRequest(
    request: SetupRefinementRequestRecordWriteRequest
  ): Promise<SetupRefinementRequestDurableRecord> {
    const setupRefinementRequestId = request.record.identity.entityId;
    if (this.recordsById.has(setupRefinementRequestId)) {
      throw createAlreadyExistsRepositoryError({
        entityType: "setup_refinement_request",
        entityId: setupRefinementRequestId,
        operation: "create"
      });
    }

    const approval = await this.assertResearchDecisionApprovalReferenceExists(request.record);
    const feedbackDecision = await this.assertResearchFeedbackDecisionReferenceExists(request.record);
    await this.assertSetupDefinitionReferenceExists(request.record);
    this.assertApprovalSetupMatch(request.record, approval);
    this.assertApprovalFeedbackMatch(request.record, approval);
    this.assertFeedbackDecisionSetupMatch(request.record, feedbackDecision);

    const record = cloneSetupRefinementRequest(request.record);
    this.recordsById.set(setupRefinementRequestId, record);
    return cloneSetupRefinementRequest(record);
  }

  private async assertResearchDecisionApprovalReferenceExists(
    record: SetupRefinementRequestDurableRecord
  ): Promise<ResearchDecisionApprovalDurableRecord> {
    const approval = await this.references.loadResearchDecisionApprovalRecord(
      record.sourceResearchDecisionApprovalId
    );
    if (!approval) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_refinement_request",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_decision_approval",
        referenceEntityId: record.sourceResearchDecisionApprovalId
      });
    }

    return approval;
  }

  private async assertResearchFeedbackDecisionReferenceExists(
    record: SetupRefinementRequestDurableRecord
  ): Promise<ResearchFeedbackDecisionDurableRecord> {
    const feedbackDecision = await this.references.loadResearchFeedbackDecisionRecord(
      record.sourceResearchFeedbackDecisionId
    );
    if (!feedbackDecision) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_refinement_request",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: record.sourceResearchFeedbackDecisionId
      });
    }

    return feedbackDecision;
  }

  private async assertSetupDefinitionReferenceExists(
    record: SetupRefinementRequestDurableRecord
  ): Promise<void> {
    const setupDefinition = await this.references.loadSetupDefinitionRecord(
      record.setupDefinitionId
    );
    if (!setupDefinition) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_refinement_request",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "setup_definition",
        referenceEntityId: record.setupDefinitionId
      });
    }
  }

  private assertApprovalSetupMatch(
    record: SetupRefinementRequestDurableRecord,
    approval: ResearchDecisionApprovalDurableRecord
  ): void {
    if (approval.setupDefinitionId !== record.setupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_refinement_request",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_decision_approval",
        referenceEntityId: record.sourceResearchDecisionApprovalId
      });
    }
  }

  private assertApprovalFeedbackMatch(
    record: SetupRefinementRequestDurableRecord,
    approval: ResearchDecisionApprovalDurableRecord
  ): void {
    if (approval.researchFeedbackDecisionId !== record.sourceResearchFeedbackDecisionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_refinement_request",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_decision_approval",
        referenceEntityId: record.sourceResearchDecisionApprovalId
      });
    }
  }

  private assertFeedbackDecisionSetupMatch(
    record: SetupRefinementRequestDurableRecord,
    feedbackDecision: ResearchFeedbackDecisionDurableRecord
  ): void {
    if (feedbackDecision.setupDefinitionId !== record.setupDefinitionId) {
      throw createInvalidReferenceRepositoryError({
        entityType: "setup_refinement_request",
        entityId: record.identity.entityId,
        operation: "create",
        referenceEntityType: "research_feedback_decision",
        referenceEntityId: record.sourceResearchFeedbackDecisionId
      });
    }
  }
}
