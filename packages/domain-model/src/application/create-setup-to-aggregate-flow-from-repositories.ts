import type {
  EvaluationResultRepository,
  MonitoredSymbolRepository,
  ResearchHypothesisRepository,
  ResearchRunRepository,
  SetupAggregateResultRepository,
  SetupDefinitionRepository,
  SignalCandidateRepository
} from "../repositories/index.js";
import { createEvaluationService } from "../services/evaluation-service.js";
import { createMonitoringCatalogService } from "../services/monitoring-catalog-service.js";
import { createResearchAggregationService } from "../services/research-aggregation-service.js";
import { createResearchRunService } from "../services/research-run-service.js";
import { createResearchService } from "../services/research-service.js";
import { createSetupDefinitionService } from "../services/setup-definition-service.js";
import { createSignalCandidateService } from "../services/signal-candidate-service.js";
import {
  createSetupToAggregateFlow,
  type SetupToAggregateFlowDependencies
} from "./create-setup-to-aggregate-flow.js";

export type SetupToAggregateFlowRepositories = {
  setupDefinitionRepository: SetupDefinitionRepository;
  researchHypothesisRepository: ResearchHypothesisRepository;
  monitoredSymbolRepository: MonitoredSymbolRepository;
  signalCandidateRepository: SignalCandidateRepository;
  evaluationResultRepository: EvaluationResultRepository;
  researchRunRepository: ResearchRunRepository;
  setupAggregateResultRepository: SetupAggregateResultRepository;
};

export const createSetupToAggregateFlowFromRepositories = (
  repositories: SetupToAggregateFlowRepositories
): ReturnType<typeof createSetupToAggregateFlow> => {
  const dependencies: SetupToAggregateFlowDependencies = {
    setupDefinitionService: createSetupDefinitionService({
      setupDefinitionRepository: repositories.setupDefinitionRepository
    }),
    researchService: createResearchService({
      researchHypothesisRepository: repositories.researchHypothesisRepository,
      setupDefinitionRepository: repositories.setupDefinitionRepository
    }),
    monitoringCatalogService: createMonitoringCatalogService({
      monitoredSymbolRepository: repositories.monitoredSymbolRepository
    }),
    signalCandidateService: createSignalCandidateService({
      signalCandidateRepository: repositories.signalCandidateRepository,
      setupDefinitionRepository: repositories.setupDefinitionRepository,
      monitoredSymbolRepository: repositories.monitoredSymbolRepository
    }),
    evaluationService: createEvaluationService({
      evaluationResultRepository: repositories.evaluationResultRepository,
      signalCandidateRepository: repositories.signalCandidateRepository
    }),
    researchRunService: createResearchRunService({
      researchRunRepository: repositories.researchRunRepository,
      researchHypothesisRepository: repositories.researchHypothesisRepository,
      setupDefinitionRepository: repositories.setupDefinitionRepository,
      signalCandidateRepository: repositories.signalCandidateRepository,
      evaluationResultRepository: repositories.evaluationResultRepository
    }),
    researchAggregationService: createResearchAggregationService({
      setupAggregateResultRepository: repositories.setupAggregateResultRepository,
      setupDefinitionRepository: repositories.setupDefinitionRepository,
      researchHypothesisRepository: repositories.researchHypothesisRepository,
      researchRunRepository: repositories.researchRunRepository,
      evaluationResultRepository: repositories.evaluationResultRepository,
      signalCandidateRepository: repositories.signalCandidateRepository
    })
  };

  return createSetupToAggregateFlow(dependencies);
};
