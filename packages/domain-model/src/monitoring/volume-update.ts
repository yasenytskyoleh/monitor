import type { NormalizedEventBase, TimeframeLabel } from "./normalized-event.js";

export type VolumeUpdatePayload = {
  timeframe: TimeframeLabel;
  observedVolume: number;
  quoteVolume: number | null;
};

export type VolumeUpdateEvent = NormalizedEventBase<"volume_update", VolumeUpdatePayload> & {
  symbolId: string;
};
