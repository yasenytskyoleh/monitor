import assert from "node:assert/strict";
import test from "node:test";

import {
  EVALUATION_OUTCOMES,
  EVALUATION_WINDOW_UNITS,
  MONITORED_SYMBOL_STATUSES,
  RESEARCH_HYPOTHESIS_STATUSES,
  SETUP_DEFINITION_STATUSES,
  SIGNAL_CANDIDATE_STATUSES,
  type EvaluationResult,
  type EvaluationWindow,
  type MonitoredSymbol,
  type ResearchHypothesis,
  type ResearchRun,
  type SetupDefinition,
  type SignalCandidate
} from "../src/index.js";

test("exposes expected lifecycle enums for the first product-domain slice", () => {
  assert.deepEqual(MONITORED_SYMBOL_STATUSES, ["active", "paused", "archived"]);
  assert.deepEqual(SETUP_DEFINITION_STATUSES, ["draft", "active", "archived"]);
  assert.deepEqual(SIGNAL_CANDIDATE_STATUSES, ["detected", "under_review", "evaluated", "discarded"]);
  assert.deepEqual(EVALUATION_WINDOW_UNITS, ["minutes", "hours", "days"]);
  assert.deepEqual(EVALUATION_OUTCOMES, ["win", "loss", "neutral", "invalidated", "no_data"]);
  assert.deepEqual(RESEARCH_HYPOTHESIS_STATUSES, ["draft", "active", "paused", "closed"]);
});

test("supports constructing typed contracts without implementation logic", () => {
  const symbol: MonitoredSymbol = {
    symbolId: "BTC-USDT",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    displayName: "BTC/USDT",
    marketScope: "spot",
    status: "active",
    providerHint: "unknown",
    tags: ["core"],
    createdAtUtc: "2026-04-14T10:00:00.000Z",
    updatedAtUtc: "2026-04-14T10:00:00.000Z"
  };

  const setup: SetupDefinition = {
    setupId: "setup-breakout-001",
    name: "Breakout Retest",
    description: "Retest after breakout with volume confirmation",
    status: "active",
    monitoredSymbolIds: [symbol.symbolId],
    conditions: [
      {
        field: "close_above_range_high",
        operator: "eq",
        value: true,
        timeframe: "4h"
      }
    ],
    evaluationAssumptions: ["evaluate over fixed 24h horizon"],
    invalidationAssumptions: ["discard if immediate breakdown below retest level"],
    tags: ["breakout", "trend"],
    createdAtUtc: "2026-04-14T10:00:00.000Z",
    updatedAtUtc: "2026-04-14T10:00:00.000Z"
  };

  const candidate: SignalCandidate = {
    candidateId: "candidate-001",
    setupId: setup.setupId,
    symbolId: symbol.symbolId,
    detectedAtUtc: "2026-04-14T10:30:00.000Z",
    status: "detected",
    evidence: [
      {
        evidenceId: "evt-001",
        source: "monitor_event",
        description: "range break with elevated volume"
      }
    ],
    createdAtUtc: "2026-04-14T10:30:00.000Z",
    updatedAtUtc: "2026-04-14T10:30:00.000Z"
  };

  const window: EvaluationWindow = {
    windowId: "window-001",
    candidateId: candidate.candidateId,
    horizonValue: 24,
    horizonUnit: "hours",
    startAtUtc: "2026-04-14T10:30:00.000Z",
    endAtUtc: "2026-04-15T10:30:00.000Z",
    createdAtUtc: "2026-04-14T10:30:00.000Z",
    updatedAtUtc: "2026-04-14T10:30:00.000Z"
  };

  const result: EvaluationResult = {
    resultId: "result-001",
    candidateId: candidate.candidateId,
    windowId: window.windowId,
    outcome: "neutral",
    evaluatedAtUtc: "2026-04-15T10:45:00.000Z",
    returnPct: 0.8,
    maxFavorableExcursionPct: 2.4,
    maxAdverseExcursionPct: -1.3,
    notes: "No clean trend continuation",
    createdAtUtc: "2026-04-15T10:45:00.000Z",
    updatedAtUtc: "2026-04-15T10:45:00.000Z"
  };

  const hypothesis: ResearchHypothesis = {
    hypothesisId: "hypothesis-001",
    title: "Breakout retest has positive asymmetry in trend regime",
    statement: "When setup-breakout-001 triggers in trend regime, MFE should exceed MAE on average.",
    relatedSetupIds: [setup.setupId],
    successCriteria: ["median MFE > median |MAE| after 50 evaluated samples"],
    status: "draft",
    createdAtUtc: "2026-04-14T10:00:00.000Z",
    updatedAtUtc: "2026-04-14T10:00:00.000Z"
  };

  const run: ResearchRun = {
    runId: "run-001",
    hypothesisId: hypothesis.hypothesisId,
    setupId: setup.setupId,
    candidateIds: [candidate.candidateId],
    evaluationWindowIds: [window.windowId],
    evaluationResultIds: [result.resultId],
    status: "planned",
    startedAtUtc: "2026-04-14T11:00:00.000Z",
    createdAtUtc: "2026-04-14T11:00:00.000Z",
    updatedAtUtc: "2026-04-14T11:00:00.000Z"
  };

  assert.equal(run.evaluationResultIds.length, 1);
  assert.equal(result.outcome, "neutral");
});
