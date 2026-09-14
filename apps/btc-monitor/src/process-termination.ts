import process from "node:process";

export type ProcessTermination = {
  signal: AbortSignal;
  dispose(): void;
};

export const createProcessTermination = (): ProcessTermination => {
  const controller = new AbortController();
  const terminate = (signal: NodeJS.Signals): void => {
    if (!controller.signal.aborted) controller.abort(new Error(`terminated_by_${signal.toLowerCase()}`));
  };
  const onSigint = (): void => terminate("SIGINT");
  const onSigterm = (): void => terminate("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  return {
    signal: controller.signal,
    dispose(): void {
      process.removeListener("SIGINT", onSigint);
      process.removeListener("SIGTERM", onSigterm);
    }
  };
};
