import type { NormalizedEventBase, TimeframeLabel } from "./normalized-event.js";

export type CandleClosedPayload = {
  timeframe: TimeframeLabel;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openTimeUtc: string;
  closeTimeUtc: string;
};

export type CandleClosedEvent = NormalizedEventBase<"candle_closed", CandleClosedPayload> & {
  symbolId: string;
};
