import type { ResearchFeedbackDecision } from "../research/research-feedback-decision.js";
import type {
  ResearchFeedbackDecisionCreateRequest,
  ResearchFeedbackDecisionRepository,
  ResearchFeedbackDecisionStatusUpdateRequest
} from "./research-feedback-decision-repository.js";
import type { ResearchFeedbackDecisionDurableRecord } from "../storage/research-feedback-decision-relational-slice.js";
import type { ResearchFeedbackDecisionRelationalRepositoryAdapter } from "./research-feedback-decision-relational-repository-adapter.js";
import {
  dehydrateResearchFeedbackDecisionToDurableRecord,
  hydrateResearchFeedbackDecisionFromDurableRecord
} from "./research-feedback-decision-relational-repository-mappers.js";

const buildUpdatedTimestamp = (sourceObservedAtUtc: string | null): string =>
  sourceObservedAtUtc ?? new Date().toISOString();

const buildNextResearchFeedbackDecisionRecord = (
  decision: ResearchFeedbackDecision,
  metadata:
    | ResearchFeedbackDecisionCreateRequest["metadata"]
    | ResearchFeedbackDecisionStatusUpdateRequest["metadata"],
  currentRecord: ResearchFeedbackDecisionDurableRecord
): ResearchFeedbackDecisionDurableRecord =>
  dehydrateResearchFeedbackDecisionToDurableRecord(
    decision,
    metadata,
    currentRecord.identity.version + 1
  );

export class RelationalResearchFeedbackDecisionRepository
  implements ResearchFeedbackDecisionRepository
{
  constructor(private readonly adapter: ResearchFeedbackDecisionRelationalRepositoryAdapter) {}

  async getById(researchFeedbackDecisionId: string): Promise<ResearchFeedbackDecision | null> {
    const record = await this.adapter.loadResearchFeedbackDecisionRecord(researchFeedbackDecisionId);
    return record ? hydrateResearchFeedbackDecisionFromDurableRecord(record) : null;
  }

  async listBySetupDefinitionId(setupDefinitionId: string): Promise<ResearchFeedbackDecision[]> {
    const records = await this.adapter.listResearchFeedbackDecisionRecordsBySetupDefinitionId(
      setupDefinitionId
    );
    return records.map((record) => hydrateResearchFeedbackDecisionFromDurableRecord(record));
  }

  async listByResearchHypothesisId(
    researchHypothesisId: string
  ): Promise<ResearchFeedbackDecision[]> {
    const records = await this.adapter.listResearchFeedbackDecisionRecordsByResearchHypothesisId(
      researchHypothesisId
    );
    return records.map((record) => hydrateResearchFeedbackDecisionFromDurableRecord(record));
  }

  async create(request: ResearchFeedbackDecisionCreateRequest): Promise<ResearchFeedbackDecision> {
    const createdRecord = await this.adapter.insertResearchFeedbackDecisionRecord({
      record: dehydrateResearchFeedbackDecisionToDurableRecord(request.decision, request.metadata, 1),
      expectedVersion: null
    });

    return hydrateResearchFeedbackDecisionFromDurableRecord(createdRecord);
  }

  async updateStatus(
    request: ResearchFeedbackDecisionStatusUpdateRequest
  ): Promise<ResearchFeedbackDecision | null> {
    const currentRecord = await this.adapter.loadResearchFeedbackDecisionRecord(
      request.researchFeedbackDecisionId
    );
    if (!currentRecord) {
      return null;
    }

    const currentDecision = hydrateResearchFeedbackDecisionFromDurableRecord(currentRecord);
    const updatedRecord = await this.adapter.updateResearchFeedbackDecisionRecord({
      record: buildNextResearchFeedbackDecisionRecord(
        {
          ...currentDecision,
          decisionStatus: request.status,
          reviewerMetadata: request.reviewerMetadata ?? currentDecision.reviewerMetadata,
          updatedAt: buildUpdatedTimestamp(request.metadata.sourceObservedAtUtc)
        },
        request.metadata,
        currentRecord
      ),
      expectedVersion: request.expectedVersion
    });

    return hydrateResearchFeedbackDecisionFromDurableRecord(updatedRecord);
  }
}
