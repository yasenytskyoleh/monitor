import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const isDirectExecution = (
  moduleUrl: string,
  scriptPath: string | undefined = process.argv[1]
): boolean => {
  if (scriptPath === undefined) return false;

  try {
    return realpathSync(scriptPath) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
};
