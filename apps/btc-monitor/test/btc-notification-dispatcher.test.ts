import assert from "node:assert/strict";
import test from "node:test";

import {
  createPatternNotificationDeliveryService,
  InMemoryPatternNotificationRecordRepository,
  type PatternNotificationRecord,
  type ProductRecordMetadata
} from "@monitor/domain-model";
import type { TelegramFetch } from "@monitor/pattern-notification";

import { createBtcNotificationDispatcher } from "../src/btc-notification-dispatcher.js";

const RUN_AT = "2026-09-12T12:00:00.000Z";
const metadata: ProductRecordMetadata = {
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline",
  lastUpdatedBySource: "notification_pipeline",
  traceId: null,
  sourceObservedAtUtc: RUN_AT
};

const notification = (id: string): PatternNotificationRecord => ({
  notificationId: id,
  deduplicationKey: `signal_candidate:${id}`,
  signalCandidateId: id.replace("notification:", "candidate:"),
  setupDefinitionId: "setup-btc-breakout",
  setupRevisionId: "revision-btc-breakout",
  monitoredSymbolId: "BTC-USDT",
  setupAggregateResultId: "aggregate-btc-breakout",
  direction: "consider_long",
  observedAt: "2026-09-12T11:55:00.000Z",
  currentPrice: 67_000,
  policyId: "btc-breakout-conservative-v1",
  completedEvaluations: 40,
  positiveOutcomeRate: 0.75,
  averagePercentageMove: 1.25,
  aggregateComputedAt: "2026-09-12T11:00:00.000Z",
  deliveryStatus: "pending_delivery",
  createdAtUtc: "2026-09-12T11:55:00.000Z",
  updatedAtUtc: "2026-09-12T11:55:00.000Z"
});

test("sends a bounded pending set and records Telegram delivery without exposing credentials", async () => {
  const repository = new InMemoryPatternNotificationRecordRepository();
  const service = createPatternNotificationDeliveryService({ patternNotificationRecordRepository: repository });
  await service.retain({ notification: notification("notification:001"), metadata });
  await service.retain({ notification: notification("notification:002"), metadata });
  const calls: Parameters<TelegramFetch>[] = [];
  const fetchImpl: TelegramFetch = async (...args) => {
    calls.push(args);
    return { ok: true, status: 200, async json() { return { ok: true }; } };
  };

  const result = await createBtcNotificationDispatcher({
    configuration: {
      databaseUrl: "postgresql://monitor.example/monitor",
      telegramBotToken: "123456:fixture-token",
      telegramChatId: "-100123456",
      maxDeliveriesPerRun: 1,
      maxSignalAgeMs: 15 * 60 * 1_000,
      telegramTimeoutMs: 1_000
    },
    fetchImpl,
    now: () => RUN_AT,
    patternNotificationRecordRepository: repository
  }).dispatch();

  assert.deepEqual(result, {
    reconciliation: { status: "completed", reconciliations: [] },
    dispatch: {
      status: "completed",
      deliveries: [{ notificationId: "notification:001", status: "outcome_recorded" }]
    }
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0]?.[0] ?? "", /\/bot123456:fixture-token\/sendMessage$/);
  assert.deepEqual(JSON.parse(calls[0]?.[1].body ?? "{}"), {
    chat_id: "-100123456",
    text: [
      "BTC market decision-support alert",
      "Signal: consider long",
      "Market: BTC-USDT",
      "Observed price: 67000.00",
      "Historical evidence: 40 evaluations, 75.0% positive, 1.25% average move",
      "Signal observed: 2026-09-12T11:55:00.000Z",
      "Not financial advice. No order has been placed."
    ].join("\n"),
    disable_web_page_preview: true
  });
  const delivered = await repository.listByDeliveryStatus(["delivered"], 10);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0]?.notificationId, "notification:001");
  assert.equal(delivered[0]?.outcomeCode, "telegram_accepted");
  assert.equal((await repository.getById("notification:002"))?.deliveryStatus, "pending_delivery");
});

test("records a terminal stale outcome without calling Telegram at delivery time", async () => {
  const repository = new InMemoryPatternNotificationRecordRepository();
  const service = createPatternNotificationDeliveryService({ patternNotificationRecordRepository: repository });
  await service.retain({
    notification: {
      ...notification("notification:stale"),
      observedAt: "2026-09-12T11:44:59.999Z",
      createdAtUtc: "2026-09-12T11:44:59.999Z",
      updatedAtUtc: "2026-09-12T11:44:59.999Z"
    },
    metadata
  });
  let calls = 0;

  const result = await createBtcNotificationDispatcher({
    configuration: {
      databaseUrl: "postgresql://monitor.example/monitor",
      telegramBotToken: "123456:fixture-token",
      telegramChatId: "-100123456",
      maxDeliveriesPerRun: 1,
      maxSignalAgeMs: 15 * 60 * 1_000,
      telegramTimeoutMs: 1_000
    },
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, async json() { return { ok: true }; } };
    },
    now: () => RUN_AT,
    patternNotificationRecordRepository: repository
  }).dispatch();

  assert.deepEqual(result, {
    reconciliation: { status: "completed", reconciliations: [] },
    dispatch: {
      status: "completed",
      deliveries: [{ notificationId: "notification:stale", status: "outcome_recorded" }]
    }
  });
  assert.equal(calls, 0);
  assert.deepEqual(await repository.getById("notification:stale"), {
    ...notification("notification:stale"),
    observedAt: "2026-09-12T11:44:59.999Z",
    createdAtUtc: "2026-09-12T11:44:59.999Z",
    updatedAtUtc: RUN_AT,
    deliveryStatus: "failed",
    deliveryAttemptedAt: RUN_AT,
    completedAt: RUN_AT,
    outcomeCode: "notification_stale"
  });
});

test("reconciles a bounded attempted set before dispatching pending notifications", async () => {
  const repository = new InMemoryPatternNotificationRecordRepository();
  const service = createPatternNotificationDeliveryService({ patternNotificationRecordRepository: repository });
  const attemptedAt = "2026-09-12T11:56:00.000Z";
  const deliveryLeaseExpiresAt = "2026-09-12T11:57:00.000Z";
  const firstAttempted = notification("notification:attempted-001");
  const secondAttempted = notification("notification:attempted-002");
  const pending = notification("notification:pending");
  await service.retain({ notification: firstAttempted, metadata });
  await service.retain({ notification: secondAttempted, metadata });
  await service.retain({ notification: pending, metadata });
  for (const retained of [firstAttempted, secondAttempted]) {
    await service.claimDeliveryAttempt({
      notificationId: retained.notificationId,
      attemptedAt,
      deliveryLeaseId: `lease:${retained.notificationId}`,
      deliveryLeaseExpiresAt,
      metadata,
      expectedVersion: null
    });
  }
  let calls = 0;

  const result = await createBtcNotificationDispatcher({
    configuration: {
      databaseUrl: "postgresql://monitor.example/monitor",
      telegramBotToken: "123456:fixture-token",
      telegramChatId: "-100123456",
      maxDeliveriesPerRun: 1,
      maxSignalAgeMs: 15 * 60 * 1_000,
      telegramTimeoutMs: 1_000
    },
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200, async json() { return { ok: true }; } };
    },
    now: () => RUN_AT,
    patternNotificationRecordRepository: repository
  }).dispatch();

  assert.deepEqual(result, {
    reconciliation: {
      status: "completed",
      reconciliations: [{ notificationId: firstAttempted.notificationId, status: "reconciled" }]
    },
    dispatch: {
      status: "completed",
      deliveries: [{ notificationId: pending.notificationId, status: "outcome_recorded" }]
    }
  });
  assert.equal(calls, 1);
  assert.equal((await repository.getById(firstAttempted.notificationId))?.outcomeCode, "delivery_outcome_unconfirmed");
  assert.equal((await repository.getById(secondAttempted.notificationId))?.deliveryStatus, "delivery_attempted");
  assert.equal((await repository.getById(pending.notificationId))?.deliveryStatus, "delivered");
});
