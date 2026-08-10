import assert from "node:assert/strict";
import test from "node:test";

import type { PatternNotificationRecord } from "@monitor/domain-model";

import {
  createTelegramPatternNotificationDeliveryPort,
  formatTelegramPatternNotification,
  type TelegramFetch
} from "../src/index.js";

const notification: PatternNotificationRecord = {
  notificationId: "notification:candidate-001",
  deduplicationKey: "signal_candidate:candidate-001",
  signalCandidateId: "candidate-001",
  setupDefinitionId: "setup-001",
  setupRevisionId: "revision-001",
  monitoredSymbolId: "btc-usdt",
  setupAggregateResultId: "aggregate-001",
  direction: "consider_long",
  observedAt: "2026-08-10T10:00:00.000Z",
  currentPrice: 67_000,
  policyId: "btc-breakout-v1",
  completedEvaluations: 40,
  positiveOutcomeRate: 0.75,
  averagePercentageMove: 1.25,
  aggregateComputedAt: "2026-08-01T00:00:00.000Z",
  deliveryStatus: "delivery_attempted",
  deliveryAttemptedAt: "2026-08-10T10:00:01.000Z",
  createdAtUtc: "2026-08-10T10:00:00.000Z",
  updatedAtUtc: "2026-08-10T10:00:01.000Z"
};

const completedAt = "2026-08-10T10:00:02.000Z";

test("formats a clear Telegram decision-support message without buy execution language", () => {
  assert.equal(
    formatTelegramPatternNotification(notification),
    [
      "BTC market decision-support alert",
      "Signal: consider long",
      "Market: BTC-USDT",
      "Observed price: 67000.00",
      "Historical evidence: 40 evaluations, 75.0% positive, 1.25% average move",
      "Signal observed: 2026-08-10T10:00:00.000Z",
      "Not financial advice. No order has been placed."
    ].join("\n")
  );
});

test("sends one explicit Telegram request and returns a stable accepted outcome", async () => {
  const calls: Parameters<TelegramFetch>[] = [];
  let requestCompleted = false;
  const fetch: TelegramFetch = async (...args) => {
    calls.push(args);
    requestCompleted = true;
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };
  const port = createTelegramPatternNotificationDeliveryPort({
    botToken: "123456:secret",
    chatId: "-100123456",
    fetch,
    now: () => (requestCompleted ? completedAt : "2026-08-10T10:00:00.000Z")
  });

  assert.deepEqual(await port.deliver({ notification }), {
    status: "delivered",
    completedAt,
    outcomeCode: "telegram_accepted"
  });
  assert.deepEqual(calls, [
    [
      "https://api.telegram.org/bot123456:secret/sendMessage",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: "-100123456",
          text: formatTelegramPatternNotification(notification),
          disable_web_page_preview: true
        })
      }
    ]
  ]);
});

test("does not call Telegram for unclaimed notifications and maps provider failures to stable codes", async () => {
  let calls = 0;
  const fetch: TelegramFetch = async () => {
    calls += 1;
    return { ok: false, status: 429, async json() { return { ok: false }; } };
  };
  const port = createTelegramPatternNotificationDeliveryPort({
    botToken: "123456:secret",
    chatId: "-100123456",
    fetch,
    now: () => completedAt
  });

  assert.deepEqual(await port.deliver({ notification: { ...notification, deliveryStatus: "pending_delivery", deliveryAttemptedAt: undefined } }), {
    status: "failed",
    completedAt,
    outcomeCode: "telegram_notification_invalid"
  });
  assert.equal(calls, 0);
  assert.deepEqual(await port.deliver({ notification: null } as unknown as { notification: PatternNotificationRecord }), {
    status: "failed",
    completedAt,
    outcomeCode: "telegram_notification_invalid"
  });
  assert.equal(calls, 0);
  assert.deepEqual(await port.deliver({ notification }), {
    status: "failed",
    completedAt,
    outcomeCode: "telegram_http_429"
  });
  assert.equal(calls, 1);
});

test("rejects invalid Telegram configuration and safely classifies network failures", async () => {
  assert.throws(
    () => createTelegramPatternNotificationDeliveryPort({ botToken: "", chatId: "chat", fetch: async () => ({ ok: true, status: 200, async json() { return { ok: true }; } }) }),
    /botToken, chatId, and fetch are required/
  );
  const port = createTelegramPatternNotificationDeliveryPort({
    botToken: "123456:secret",
    chatId: "-100123456",
    fetch: async () => {
      throw new Error("network details must not escape");
    },
    now: () => completedAt
  });

  assert.deepEqual(await port.deliver({ notification }), {
    status: "failed",
    completedAt,
    outcomeCode: "telegram_network_error"
  });
});

test("does not treat an HTTP-success Telegram rejection as delivered", async () => {
  const port = createTelegramPatternNotificationDeliveryPort({
    botToken: "123456:secret",
    chatId: "-100123456",
    fetch: async () => ({ ok: true, status: 200, async json() { return { ok: false }; } }),
    now: () => completedAt
  });

  assert.deepEqual(await port.deliver({ notification }), {
    status: "failed",
    completedAt,
    outcomeCode: "telegram_rejected"
  });
});
