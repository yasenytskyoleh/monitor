import { OrchestratorExecutionError } from "@monitor/orchestrator-core";

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export type LiveOpenAiClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type JsonCompletionMessage = {
  role: "system" | "user";
  content: string;
};

export type JsonCompletionRequest = {
  model: string;
  temperature?: number;
  maxCompletionTokens?: number;
  responseFormat:
    | { type: "json_object" }
    | {
        type: "json_schema";
        jsonSchema: {
          name: string;
          schema: Record<string, unknown>;
          strict: true;
        };
      };
  messages: JsonCompletionMessage[];
};

export class LiveOpenAiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  public constructor(options: LiveOpenAiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/u, "");
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.fetchImpl = options.fetchImpl ?? fetch;

    if (!this.fetchImpl) {
      throw new OrchestratorExecutionError("Global fetch is not available for live OpenAI client");
    }
  }

  public async completeJson(request: JsonCompletionRequest): Promise<string> {
    const endpoint = `${this.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: request.model,
          temperature: request.temperature,
          ...(request.maxCompletionTokens !== undefined
            ? { max_completion_tokens: request.maxCompletionTokens }
            : {}),
          response_format:
            request.responseFormat.type === "json_schema"
              ? {
                  type: "json_schema",
                  json_schema: {
                    name: request.responseFormat.jsonSchema.name,
                    schema: request.responseFormat.jsonSchema.schema,
                    strict: request.responseFormat.jsonSchema.strict
                  }
                }
              : { type: "json_object" },
          messages: request.messages
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = await safeReadText(response);
        throw new OrchestratorExecutionError(
          `OpenAI request failed with status ${response.status}: ${errorBody || "no response body"}`
        );
      }

      const payload = (await response.json()) as OpenAiChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim().length === 0) {
        throw new OrchestratorExecutionError("OpenAI response did not include JSON message content");
      }

      return content;
    } catch (error) {
      if (error instanceof OrchestratorExecutionError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new OrchestratorExecutionError(`OpenAI request timed out after ${this.timeoutMs}ms`);
      }

      throw new OrchestratorExecutionError(
        `OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
