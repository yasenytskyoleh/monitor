import { ResponseParseError, toErrorMessage } from "./errors.js";

export function parseOpenAiStructuredResponse(rawJson: string): unknown {
  try {
    return JSON.parse(rawJson);
  } catch (error) {
    throw new ResponseParseError(
      `Failed to parse OpenAI JSON output: ${toErrorMessage(error, "invalid JSON")}`,
      {
        cause: error
      }
    );
  }
}
