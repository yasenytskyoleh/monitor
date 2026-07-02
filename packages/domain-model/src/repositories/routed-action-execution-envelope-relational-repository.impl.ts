import type { RoutedActionExecutionEnvelope } from "../execution/routed-action-execution-envelope.js";
import type { RoutedActionExecutionEnvelopeDurableRecord } from "../storage/routed-action-execution-envelope-relational-slice.js";
import type {
  RoutedActionExecutionEnvelopeCreateRequest,
  RoutedActionExecutionEnvelopeRepository
} from "./routed-action-execution-envelope-repository.js";
import type { RoutedActionExecutionEnvelopeRelationalRepositoryAdapter } from "./routed-action-execution-envelope-relational-repository-adapter.js";
import {
  dehydrateRoutedActionExecutionEnvelopeToDurableRecord,
  hydrateRoutedActionExecutionEnvelopeFromDurableRecord
} from "./routed-action-execution-envelope-relational-repository-mappers.js";

const hydrateEnvelopes = (
  records: RoutedActionExecutionEnvelopeDurableRecord[]
): RoutedActionExecutionEnvelope[] =>
  records.map((record) => hydrateRoutedActionExecutionEnvelopeFromDurableRecord(record));

export class RelationalRoutedActionExecutionEnvelopeRepository
  implements RoutedActionExecutionEnvelopeRepository
{
  constructor(
    private readonly adapter: RoutedActionExecutionEnvelopeRelationalRepositoryAdapter
  ) {}

  async getById(
    routedActionExecutionEnvelopeId: string
  ): Promise<RoutedActionExecutionEnvelope | null> {
    const record =
      await this.adapter.loadRoutedActionExecutionEnvelopeRecord(
        routedActionExecutionEnvelopeId
      );
    return record ? hydrateRoutedActionExecutionEnvelopeFromDurableRecord(record) : null;
  }

  async listByReviewDecisionId(
    researchReviewDecisionId: string
  ): Promise<RoutedActionExecutionEnvelope[]> {
    const records =
      await this.adapter.listRoutedActionExecutionEnvelopeRecordsBySourceReviewDecisionId(
        researchReviewDecisionId
      );
    return hydrateEnvelopes(records);
  }

  async create(
    request: RoutedActionExecutionEnvelopeCreateRequest
  ): Promise<RoutedActionExecutionEnvelope> {
    const record = await this.adapter.insertRoutedActionExecutionEnvelopeRecord({
      record: dehydrateRoutedActionExecutionEnvelopeToDurableRecord(
        request.envelope,
        request.metadata,
        1
      )
    });

    return hydrateRoutedActionExecutionEnvelopeFromDurableRecord(record);
  }
}
