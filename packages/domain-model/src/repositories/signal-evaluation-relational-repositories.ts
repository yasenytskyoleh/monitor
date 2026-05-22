import type { EvaluationResultRepository } from "./evaluation-result-repository.js";
import { RelationalEvaluationResultRepository } from "./evaluation-result-relational-repository.impl.js";
import { RelationalSignalCandidateRepository } from "./signal-candidate-relational-repository.impl.js";
import type { SignalCandidateRepository } from "./signal-candidate-repository.js";
import type { SignalEvaluationRelationalRepositoryAdapter } from "./signal-evaluation-relational-repository-adapter.js";

export type SignalEvaluationRelationalRepositories = {
  signalCandidateRepository: SignalCandidateRepository;
  evaluationResultRepository: EvaluationResultRepository;
};

export const composeSignalEvaluationRelationalRepositories = (
  adapter: SignalEvaluationRelationalRepositoryAdapter
): SignalEvaluationRelationalRepositories => ({
  signalCandidateRepository: new RelationalSignalCandidateRepository(adapter),
  evaluationResultRepository: new RelationalEvaluationResultRepository(adapter)
});
