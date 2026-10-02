import { writeFile } from "node:fs/promises";
import process from "node:process";

import {
  createApprovedRefinementFollowUpHandoff,
  createApprovedSetupLifecycleMutationHandoff,
  createImplementedProductRelationalPrismaRepositories,
  createResearchService,
  createResearchReviewDecisionService,
  createRevisionHistoryQueryService,
  createSetupDefinitionService,
  createSetupRevisionActivationHandoff,
  type ImplementedProductRelationalPrismaRepositories,
} from "@monitor/domain-model";
import { createReviewDecisionRuntime } from "@monitor/review-decision";
import { createReviewPacketRuntime } from "@monitor/review-packet";

import {
  type ExecutePreparedEnvelopeCommand,
  parseResearchWorkflowCommand,
  type ResearchWorkflowCommand,
} from "./cli.js";
import { readImpactSummaryFile } from "./impact-summary-file.js";
import { readReviewPacketFile } from "./review-packet-file.js";
import {
  createResearchWorkflowExecutionRuntime,
  createResearchWorkflowPreparationRuntime,
  createResearchWorkflowRoutingRuntime,
  createResearchWorkflowRuntime,
} from "./research-workflow-runtime.js";

export type ResearchWorkflowCommandResult = Awaited<
  ReturnType<
    | ReturnType<typeof createResearchWorkflowRoutingRuntime>["route"]
    | ReturnType<typeof createResearchWorkflowPreparationRuntime>["prepare"]
    | ReturnType<typeof createResearchWorkflowExecutionRuntime>["execute"]
    | ReturnType<typeof createReviewPacketRuntime>["build"]
    | ReturnType<typeof createReviewDecisionRuntime>["record"]
  >
>;

const createExecutionRuntime = (
  repositories: ImplementedProductRelationalPrismaRepositories,
  command: ExecutePreparedEnvelopeCommand,
) => {
  const setupDefinitionService = createSetupDefinitionService(repositories);
  const researchService = createResearchService(repositories);

  return createResearchWorkflowRuntime({
    repositories,
    activationExecutor: {
      setupRevisionActivationHandoff: createSetupRevisionActivationHandoff({
        setupDefinitionService,
        setupDefinitionRevisionRepository: repositories.setupDefinitionRevisionRepository,
      }),
      activatedBy: command.executedBy,
      now: () => command.executedAt,
    },
    lifecycleExecutor: {
      setupLifecycleMutationHandoff: createApprovedSetupLifecycleMutationHandoff({
        setupDefinitionService,
        researchDecisionApprovalRepository: repositories.researchDecisionApprovalRepository,
        setupDefinitionRepository: repositories.setupDefinitionRepository,
      }),
      mutatedBy: command.executedBy,
      now: () => command.executedAt,
    },
    refinementExecutor: {
      setupRefinementHandoff: createApprovedRefinementFollowUpHandoff({
        researchService,
        researchDecisionApprovalRepository: repositories.researchDecisionApprovalRepository,
        setupDefinitionRepository: repositories.setupDefinitionRepository,
      }),
    },
  }).preparedEnvelopeExecution;
};

export const executeResearchWorkflowCommand = async (
  command: ResearchWorkflowCommand,
  repositories: ImplementedProductRelationalPrismaRepositories,
): Promise<ResearchWorkflowCommandResult> => {
  if (command.name === "review-packet") {
    const { name: _name, outputFile, impactSummaryFile, ...request } = command;
    const impactSummarySnapshot = impactSummaryFile
      ? await readImpactSummaryFile(impactSummaryFile)
      : undefined;
    const reviewPacketService = createRevisionHistoryQueryService({
      setupDefinitionRevisionRepository: repositories.setupDefinitionRevisionRepository,
      setupDefinitionRepository: repositories.setupDefinitionRepository,
      signalCandidateRepository: repositories.signalCandidateRepository,
      evaluationResultRepository: repositories.evaluationResultRepository,
      setupAggregateResultRepository: repositories.setupAggregateResultRepository,
      researchHypothesisRepository: repositories.researchHypothesisRepository,
      researchFeedbackDecisionRepository: repositories.researchFeedbackDecisionRepository,
      researchDecisionApprovalRepository: repositories.researchDecisionApprovalRepository,
    });
    const result = await createReviewPacketRuntime({ reviewPacketService }).build({
      ...request,
      ...(impactSummarySnapshot ? { impactSummarySnapshot } : {}),
    });
    if (result.packet) {
      await writeFile(outputFile, `${JSON.stringify(result)}\n`, { flag: "wx", mode: 0o600 });
    }
    return result;
  }
  if (command.name === "review-decision") {
    const { name: _name, packetFile, ...decision } = command;
    const packet = await readReviewPacketFile(packetFile);
    const reviewDecisionService = createResearchReviewDecisionService({
      reviewPacketLookup: {
        async getById(packetId) {
          return packet.id === packetId ? packet : null;
        },
      },
      researchReviewDecisionRepository: repositories.researchReviewDecisionRepository,
    });
    return createReviewDecisionRuntime({ reviewDecisionService }).record(decision);
  }
  if (command.name === "route") {
    return createResearchWorkflowRoutingRuntime(repositories).route({
      researchReviewDecisionId: command.researchReviewDecisionId,
      routedAt: command.routedAt,
    });
  }
  if (command.name === "prepare") {
    return createResearchWorkflowPreparationRuntime(repositories).prepare({
      reviewDecisionRoutingResultId: command.reviewDecisionRoutingResultId,
      targetEntityRefs: command.targetEntityRefs,
      ...(command.refinementInput ? { refinementInput: command.refinementInput } : {}),
      preparedBy: command.preparedBy,
      preparedAt: command.preparedAt,
      ...(command.originRunId ? { originRunId: command.originRunId } : {}),
    });
  }

  return createExecutionRuntime(repositories, command).execute({
    routedActionExecutionEnvelopeId: command.routedActionExecutionEnvelopeId,
    attemptId: command.attemptId,
    attemptedBy: command.attemptedBy,
    attemptedAt: command.attemptedAt,
    ...(command.originRunId ? { originRunId: command.originRunId } : {}),
  });
};

const requireDatabaseUrl = (environment: NodeJS.ProcessEnv): string => {
  const databaseUrl = environment.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  return databaseUrl;
};

export const runResearchWorkflowCli = async (
  argv = process.argv.slice(2),
  environment = process.env,
): Promise<ResearchWorkflowCommandResult> => {
  const command = parseResearchWorkflowCommand(argv);
  const repositories = createImplementedProductRelationalPrismaRepositories({
    connectionString: requireDatabaseUrl(environment),
  });
  try {
    const result = await executeResearchWorkflowCommand(command, repositories);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
  } finally {
    await repositories.disconnect();
  }
};
