import type { RefinementExecutionInput, RoutedActionTargetEntityRefs } from "@monitor/domain-model";

export type RouteResearchDecisionCommand = {
  name: "route";
  researchReviewDecisionId: string;
  routedAt: string;
};

export type PrepareRoutedActionCommand = {
  name: "prepare";
  reviewDecisionRoutingResultId: string;
  targetEntityRefs: Omit<RoutedActionTargetEntityRefs, "setupFamilyId">;
  refinementInput?: RefinementExecutionInput;
  preparedBy: string;
  preparedAt: string;
  originRunId?: string;
};

export type ExecutePreparedEnvelopeCommand = {
  name: "execute";
  routedActionExecutionEnvelopeId: string;
  attemptId: string;
  attemptedBy: string;
  attemptedAt: string;
  executedBy: string;
  executedAt: string;
  originRunId?: string;
};

export type ResearchWorkflowCommand =
  | RouteResearchDecisionCommand
  | PrepareRoutedActionCommand
  | ExecutePreparedEnvelopeCommand;

type ParsedOptions = ReadonlyMap<string, readonly string[]>;

const COMMON_OPTIONS = ["--origin-run-id"] as const;
const ROUTE_OPTIONS = ["--decision-id", "--routed-at"] as const;
const PREPARE_OPTIONS = [
  "--routing-id",
  "--prepared-by",
  "--prepared-at",
  "--setup-definition-id",
  "--setup-revision-id",
  "--research-hypothesis-id",
  "--research-feedback-decision-id",
  "--research-decision-approval-id",
  "--requested-by",
  "--requested-at",
  "--refinement-rationale",
  "--requested-changes",
  "--evidence-reference",
  ...COMMON_OPTIONS,
] as const;
const EXECUTE_OPTIONS = [
  "--envelope-id",
  "--attempt-id",
  "--attempted-by",
  "--attempted-at",
  "--executed-by",
  "--executed-at",
  ...COMMON_OPTIONS,
] as const;

const parseOptions = (argv: string[], allowedOptions: readonly string[]): ParsedOptions => {
  const values = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!option || !allowedOptions.includes(option)) {
      throw new Error(`Unknown option: ${option ?? ""}`);
    }
    if (!value?.trim() || value.startsWith("--")) {
      throw new Error(`${option} requires a value`);
    }
    values.set(option, [...(values.get(option) ?? []), value.trim()]);
  }
  return values;
};

const requireOption = (options: ParsedOptions, name: string): string => {
  const value = options.get(name)?.at(-1);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

const optionalOption = (options: ParsedOptions, name: string): string | undefined =>
  options.get(name)?.at(-1);

const parseRouteCommand = (argv: string[]): RouteResearchDecisionCommand => {
  const options = parseOptions(argv, ROUTE_OPTIONS);
  return {
    name: "route",
    researchReviewDecisionId: requireOption(options, "--decision-id"),
    routedAt: requireOption(options, "--routed-at"),
  };
};

const parseTargetEntityRefs = (
  options: ParsedOptions,
): Omit<RoutedActionTargetEntityRefs, "setupFamilyId"> => ({
  ...(optionalOption(options, "--setup-definition-id")
    ? { setupDefinitionId: optionalOption(options, "--setup-definition-id") }
    : {}),
  ...(optionalOption(options, "--setup-revision-id")
    ? { setupRevisionId: optionalOption(options, "--setup-revision-id") }
    : {}),
  ...(optionalOption(options, "--research-hypothesis-id")
    ? { researchHypothesisId: optionalOption(options, "--research-hypothesis-id") }
    : {}),
  ...(optionalOption(options, "--research-feedback-decision-id")
    ? { researchFeedbackDecisionId: optionalOption(options, "--research-feedback-decision-id") }
    : {}),
  ...(optionalOption(options, "--research-decision-approval-id")
    ? { researchDecisionApprovalId: optionalOption(options, "--research-decision-approval-id") }
    : {}),
});

const parseRefinementInput = (options: ParsedOptions): RefinementExecutionInput | undefined => {
  const requestedBy = optionalOption(options, "--requested-by");
  const requestedAt = optionalOption(options, "--requested-at");
  const refinementRationaleSummary = optionalOption(options, "--refinement-rationale");
  const requestedChangesSummary = optionalOption(options, "--requested-changes");
  const hasRefinementInput = [
    requestedBy,
    requestedAt,
    refinementRationaleSummary,
    requestedChangesSummary,
    options.has("--evidence-reference"),
  ].some(Boolean);
  if (!hasRefinementInput) {
    return undefined;
  }
  return {
    requestedBy: requireOption(options, "--requested-by"),
    requestedAt: requireOption(options, "--requested-at"),
    refinementRationaleSummary: requireOption(options, "--refinement-rationale"),
    requestedChangesSummary: requireOption(options, "--requested-changes"),
    ...(options.get("--evidence-reference")
      ? { evidenceReferences: [...(options.get("--evidence-reference") ?? [])] }
      : {}),
  };
};

const parsePrepareCommand = (argv: string[]): PrepareRoutedActionCommand => {
  const options = parseOptions(argv, PREPARE_OPTIONS);
  const refinementInput = parseRefinementInput(options);
  const originRunId = optionalOption(options, "--origin-run-id");
  return {
    name: "prepare",
    reviewDecisionRoutingResultId: requireOption(options, "--routing-id"),
    targetEntityRefs: parseTargetEntityRefs(options),
    ...(refinementInput ? { refinementInput } : {}),
    preparedBy: requireOption(options, "--prepared-by"),
    preparedAt: requireOption(options, "--prepared-at"),
    ...(originRunId ? { originRunId } : {}),
  };
};

const parseExecuteCommand = (argv: string[]): ExecutePreparedEnvelopeCommand => {
  const options = parseOptions(argv, EXECUTE_OPTIONS);
  const originRunId = optionalOption(options, "--origin-run-id");
  return {
    name: "execute",
    routedActionExecutionEnvelopeId: requireOption(options, "--envelope-id"),
    attemptId: requireOption(options, "--attempt-id"),
    attemptedBy: requireOption(options, "--attempted-by"),
    attemptedAt: requireOption(options, "--attempted-at"),
    executedBy: requireOption(options, "--executed-by"),
    executedAt: requireOption(options, "--executed-at"),
    ...(originRunId ? { originRunId } : {}),
  };
};

export const parseResearchWorkflowCommand = (argv: string[]): ResearchWorkflowCommand => {
  const [commandName, ...commandArguments] = argv;
  if (commandName === "route") {
    return parseRouteCommand(commandArguments);
  }
  if (commandName === "prepare") {
    return parsePrepareCommand(commandArguments);
  }
  if (commandName === "execute") {
    return parseExecuteCommand(commandArguments);
  }
  throw new Error("Expected one command: route, prepare, or execute");
};
