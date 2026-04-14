import type { NormalizedEventBase } from "./normalized-event.js";

export type PriceTickPayload = {
  price: number;
  bid: number | null;
  ask: number | null;
  tradeCount: number | null;
};

export type PriceTickEvent = NormalizedEventBase<"price_tick", PriceTickPayload> & {
  symbolId: string;
};
