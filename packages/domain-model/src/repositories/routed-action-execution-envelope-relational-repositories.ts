import type { RoutedActionExecutionEnvelopeRepository } from "./routed-action-execution-envelope-repository.js";
import type { RoutedActionExecutionEnvelopeRelationalRepositoryAdapter } from "./routed-action-execution-envelope-relational-repository-adapter.js";
import { RelationalRoutedActionExecutionEnvelopeRepository } from "./routed-action-execution-envelope-relational-repository.impl.js";

export type RoutedActionExecutionEnvelopeRelationalRepositories = {
  routedActionExecutionEnvelopeRepository: RoutedActionExecutionEnvelopeRepository;
};

export const composeRoutedActionExecutionEnvelopeRelationalRepositories = (
  adapter: RoutedActionExecutionEnvelopeRelationalRepositoryAdapter
): RoutedActionExecutionEnvelopeRelationalRepositories => ({
  routedActionExecutionEnvelopeRepository:
    new RelationalRoutedActionExecutionEnvelopeRepository(adapter)
});
