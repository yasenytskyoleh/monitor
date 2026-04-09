import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PromptLoadError, toErrorMessage } from "./errors.js";

const PROMPT_CACHE = new Map<string, string>();

export async function loadPromptTemplateCached(
  promptsRootDir: string,
  promptVersion: string,
  promptFile: string
): Promise<string> {
  const cacheKey = `${promptsRootDir}/${promptVersion}/${promptFile}`;
  const cached = PROMPT_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promptPath = join(promptsRootDir, promptVersion, promptFile);
  try {
    const promptText = await readFile(promptPath, "utf8");
    PROMPT_CACHE.set(cacheKey, promptText);
    return promptText;
  } catch (error) {
    throw new PromptLoadError(
      `Failed to load prompt template '${promptVersion}/${promptFile}': ${toErrorMessage(
        error,
        "unknown error"
      )}`,
      {
        cause: error
      }
    );
  }
}
