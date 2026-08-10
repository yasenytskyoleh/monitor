import type { PatternNotificationRecord } from "@monitor/domain-model";

import type {
  PatternNotificationDeliveryPort,
  PatternNotificationDeliveryPortOutcome,
  PatternNotificationDeliveryPortRequest
} from "./retention.js";

type TelegramFetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

export type TelegramFetch = (
  input: string,
  init: {
    method: "POST";
    headers: { "content-type": "application/json" };
    body: string;
  }
) => Promise<TelegramFetchResponse>;

export type TelegramPatternNotificationDeliveryPortOptions = {
  botToken: string;
  chatId: string;
  fetch: TelegramFetch;
  now?: () => string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidTimestamp = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value));

const isSafeTelegramConfig = (
  options: TelegramPatternNotificationDeliveryPortOptions
): boolean =>
  isNonEmptyString(options.botToken) &&
  !/\s/.test(options.botToken) &&
  isNonEmptyString(options.chatId) &&
  typeof options.fetch === "function";

const hasDeliverableNotification = (
  value: unknown
): value is PatternNotificationRecord => {
  if (!isRecord(value)) return false;
  const notification = value as Partial<PatternNotificationRecord>;
  return (
    notification.deliveryStatus === "delivery_attempted" &&
    notification.direction === "consider_long" &&
    isNonEmptyString(notification.monitoredSymbolId) &&
    typeof notification.currentPrice === "number" &&
    Number.isFinite(notification.currentPrice) &&
    notification.currentPrice > 0 &&
    typeof notification.completedEvaluations === "number" &&
    Number.isInteger(notification.completedEvaluations) &&
    notification.completedEvaluations > 0 &&
    typeof notification.positiveOutcomeRate === "number" &&
    Number.isFinite(notification.positiveOutcomeRate) &&
    notification.positiveOutcomeRate >= 0 &&
    notification.positiveOutcomeRate <= 1 &&
    typeof notification.averagePercentageMove === "number" &&
    Number.isFinite(notification.averagePercentageMove) &&
    isValidTimestamp(notification.observedAt) &&
    isValidTimestamp(notification.aggregateComputedAt) &&
    isValidTimestamp(notification.deliveryAttemptedAt)
  );
};

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export const formatTelegramPatternNotification = (
  notification: PatternNotificationRecord
): string =>
  [
    "BTC market decision-support alert",
    `Signal: consider long`,
    `Market: ${notification.monitoredSymbolId.toUpperCase()}`,
    `Observed price: ${notification.currentPrice.toFixed(2)}`,
    `Historical evidence: ${notification.completedEvaluations} evaluations, ${formatPercent(
      notification.positiveOutcomeRate
    )} positive, ${notification.averagePercentageMove.toFixed(2)}% average move`,
    `Signal observed: ${notification.observedAt}`,
    "Not financial advice. No order has been placed."
  ].join("\n");

const safeHttpOutcomeCode = (status: number): string =>
  Number.isInteger(status) && status >= 100 && status <= 599
    ? `telegram_http_${status}`
    : "telegram_http_failure";

const hasAcceptedTelegramResponse = (value: unknown): boolean =>
  isRecord(value) && value.ok === true;

const failure = (completedAt: string, outcomeCode: string): PatternNotificationDeliveryPortOutcome => ({
  status: "failed",
  completedAt,
  outcomeCode
});

export const createTelegramPatternNotificationDeliveryPort = (
  options: TelegramPatternNotificationDeliveryPortOptions
): PatternNotificationDeliveryPort => {
  if (!isSafeTelegramConfig(options)) {
    throw new Error("Telegram botToken, chatId, and fetch are required");
  }

  const now = options.now ?? (() => new Date().toISOString());
  const endpoint = `https://api.telegram.org/bot${options.botToken}/sendMessage`;
  const completedAt = (): string => {
    const value = now();
    if (!isValidTimestamp(value)) {
      throw new Error("Telegram delivery clock must return a valid timestamp");
    }
    return value;
  };

  return {
    async deliver(
      request: PatternNotificationDeliveryPortRequest
    ): Promise<PatternNotificationDeliveryPortOutcome> {
      if (!hasDeliverableNotification(request?.notification)) {
        return failure(completedAt(), "telegram_notification_invalid");
      }

      try {
        const response = await options.fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: options.chatId,
            text: formatTelegramPatternNotification(request.notification),
            disable_web_page_preview: true
          })
        });
        if (!response.ok) {
          return failure(completedAt(), safeHttpOutcomeCode(response.status));
        }
        try {
          return hasAcceptedTelegramResponse(await response.json())
            ? { status: "delivered", completedAt: completedAt(), outcomeCode: "telegram_accepted" }
            : failure(completedAt(), "telegram_rejected");
        } catch {
          return failure(completedAt(), "telegram_response_invalid");
        }
      } catch {
        return failure(completedAt(), "telegram_network_error");
      }
    }
  };
};
