import type {
  ResearchHypothesisCreateRequest,
  ResearchHypothesisRepository,
  ResearchHypothesisStatusUpdateRequest,
  ResearchHypothesisUpdateRequest
} from "./research-hypothesis-repository.js";
import type {
  FirstDurableRelationalRepositoryAdapter,
  ResearchHypothesisDurableRecordBundle
} from "./first-durable-relational-repository-adapter.js";
import {
  dehydrateResearchHypothesisToDurableBundle,
  hydrateResearchHypothesisFromDurableBundle
} from "./first-durable-relational-repository-mappers.js";
import { createNotFoundRepositoryError } from "./repository-error.js";
import type { ResearchHypothesis } from "../research-hypothesis.js";

const buildUpdatedTimestamp = (sourceObservedAtUtc: string | null): string =>
  sourceObservedAtUtc ?? new Date().toISOString();

const buildNextResearchHypothesisBundle = (
  hypothesis: ResearchHypothesis,
  metadata: ResearchHypothesisStatusUpdateRequest["metadata"] | ResearchHypothesisUpdateRequest["metadata"],
  currentBundle: ResearchHypothesisDurableRecordBundle
): ResearchHypothesisDurableRecordBundle =>
  dehydrateResearchHypothesisToDurableBundle(
    hypothesis,
    metadata,
    currentBundle.hypothesisRecord.identity.version + 1
  );

export class RelationalResearchHypothesisRepository implements ResearchHypothesisRepository {
  constructor(private readonly adapter: FirstDurableRelationalRepositoryAdapter) {}

  async getById(researchHypothesisId: string): Promise<ResearchHypothesis | null> {
    const bundle = await this.adapter.loadResearchHypothesisBundle(researchHypothesisId);
    return bundle ? hydrateResearchHypothesisFromDurableBundle(bundle) : null;
  }

  async listByStatus(statuses: ResearchHypothesis["status"][]): Promise<ResearchHypothesis[]> {
    const bundles = await this.adapter.listResearchHypothesisBundlesByStatus(statuses);
    return bundles.map((bundle) => hydrateResearchHypothesisFromDurableBundle(bundle));
  }

  async create(request: ResearchHypothesisCreateRequest): Promise<ResearchHypothesis> {
    const createdBundle = await this.adapter.insertResearchHypothesisBundle({
      bundle: dehydrateResearchHypothesisToDurableBundle(request.hypothesis, request.metadata, 1),
      expectedVersion: null
    });

    return hydrateResearchHypothesisFromDurableBundle(createdBundle);
  }

  async update(request: ResearchHypothesisUpdateRequest): Promise<ResearchHypothesis> {
    const currentBundle = await this.adapter.loadResearchHypothesisBundle(request.hypothesis.id);
    if (!currentBundle) {
      throw createNotFoundRepositoryError({
        entityType: "research_hypothesis",
        entityId: request.hypothesis.id,
        operation: "update"
      });
    }

    const updatedBundle = await this.adapter.updateResearchHypothesisBundle({
      bundle: buildNextResearchHypothesisBundle(request.hypothesis, request.metadata, currentBundle),
      expectedVersion: request.expectedVersion
    });

    return hydrateResearchHypothesisFromDurableBundle(updatedBundle);
  }

  async updateStatus(
    request: ResearchHypothesisStatusUpdateRequest
  ): Promise<ResearchHypothesis | null> {
    const currentBundle = await this.adapter.loadResearchHypothesisBundle(request.researchHypothesisId);
    if (!currentBundle) {
      return null;
    }

    const currentHypothesis = hydrateResearchHypothesisFromDurableBundle(currentBundle);
    const updatedBundle = await this.adapter.updateResearchHypothesisBundle({
      bundle: buildNextResearchHypothesisBundle(
        {
          ...currentHypothesis,
          status: request.status,
          updatedAt: buildUpdatedTimestamp(request.metadata.sourceObservedAtUtc)
        },
        request.metadata,
        currentBundle
      ),
      expectedVersion: request.expectedVersion
    });

    return hydrateResearchHypothesisFromDurableBundle(updatedBundle);
  }
}
