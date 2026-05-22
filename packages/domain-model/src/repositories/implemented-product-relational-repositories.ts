import type {
  FirstDurableRelationalRepositoryAdapter
} from "./first-durable-relational-repository-adapter.js";
import {
  composeFirstDurableRelationalRepositories,
  type FirstDurableRelationalRepositories
} from "./first-durable-relational-repositories.js";
import {
  composeSetupAggregateRelationalRepositories,
  type SetupAggregateRelationalRepositories
} from "./setup-aggregate-relational-repositories.js";
import type {
  SetupAggregateRelationalRepositoryAdapter
} from "./setup-aggregate-relational-repository-adapter.js";
import type {
  SignalEvaluationRelationalRepositoryAdapter
} from "./signal-evaluation-relational-repository-adapter.js";
import {
  composeSignalEvaluationRelationalRepositories,
  type SignalEvaluationRelationalRepositories
} from "./signal-evaluation-relational-repositories.js";

export type ImplementedProductRelationalAdapters = {
  firstDurableAdapter: FirstDurableRelationalRepositoryAdapter;
  signalEvaluationAdapter: SignalEvaluationRelationalRepositoryAdapter;
  setupAggregateAdapter: SetupAggregateRelationalRepositoryAdapter;
};

export type ImplementedProductRelationalRepositories =
  FirstDurableRelationalRepositories &
  SignalEvaluationRelationalRepositories &
  SetupAggregateRelationalRepositories;

export const composeImplementedProductRelationalRepositories = (
  adapters: ImplementedProductRelationalAdapters
): ImplementedProductRelationalRepositories => ({
  ...composeFirstDurableRelationalRepositories(adapters.firstDurableAdapter),
  ...composeSignalEvaluationRelationalRepositories(adapters.signalEvaluationAdapter),
  ...composeSetupAggregateRelationalRepositories(adapters.setupAggregateAdapter)
});
