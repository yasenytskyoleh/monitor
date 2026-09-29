import type {
  DownstreamActionExecutor,
  RoutedActionExecutionEnvelope,
} from "@monitor/domain-model";

export type DownstreamActionExecutorDispatcherOptions = {
  activationExecutor: DownstreamActionExecutor;
  lifecycleExecutor: DownstreamActionExecutor;
  refinementExecutor: DownstreamActionExecutor;
};

export const createDownstreamActionExecutorDispatcher = (
  options: DownstreamActionExecutorDispatcherOptions,
): DownstreamActionExecutor => ({
  async execute(envelope: RoutedActionExecutionEnvelope) {
    switch (envelope.actionTarget) {
      case "activate_setup_revision":
        return options.activationExecutor.execute(envelope);
      case "apply_setup_lifecycle_mutation":
        return options.lifecycleExecutor.execute(envelope);
      case "create_setup_refinement_request":
        return options.refinementExecutor.execute(envelope);
      default:
        return { status: "rejected", outcomeCode: "unsupported_action_target" };
    }
  },
});
