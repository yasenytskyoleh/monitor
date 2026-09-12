import type { AggregationScope } from "@monitor/domain-model";
import { CANDLE_EVALUATION_WINDOW_ID } from "@monitor/candle-evaluation";

const ALL_TIME_RANGE: AggregationScope["timeRange"] = {
  startAtUtc: "1970-01-01T00:00:00.000Z",
  endAtUtc: "9999-12-31T23:59:59.999Z"
};

export type BtcAggregateScope = Omit<AggregationScope, "evaluationWindowId"> & {
  evaluationWindowId: typeof CANDLE_EVALUATION_WINDOW_ID;
};

export const createBtcAggregateScope = (
  setupDefinitionId: string,
  monitoredSymbolId: string
): BtcAggregateScope => ({
  setupDefinitionId,
  evaluationWindowId: CANDLE_EVALUATION_WINDOW_ID,
  symbolScope: { kind: "single_symbol", symbolIds: [monitoredSymbolId] },
  timeRange: ALL_TIME_RANGE
});
