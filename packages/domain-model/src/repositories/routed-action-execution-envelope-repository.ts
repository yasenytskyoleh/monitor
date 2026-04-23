import type { RoutedActionExecutionEnvelope } from "../execution/routed-action-execution-envelope.js";
import type { ProductRecordMetadata } from "../storage/product-record-metadata.js";

export type RoutedActionExecutionEnvelopeCreateRequest = {
  envelope: RoutedActionExecutionEnvelope;
  metadata: ProductRecordMetadata;
};

export type RoutedActionExecutionEnvelopeRepository = {
  getById(routedActionExecutionEnvelopeId: string): Promise<RoutedActionExecutionEnvelope | null>;
  listByReviewDecisionId(researchReviewDecisionId: string): Promise<RoutedActionExecutionEnvelope[]>;
  create(request: RoutedActionExecutionEnvelopeCreateRequest): Promise<RoutedActionExecutionEnvelope>;
};
