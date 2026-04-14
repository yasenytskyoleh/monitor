import type { NormalizedEventBase } from "./normalized-event.js";

export const MONITORING_HEARTBEAT_STATUSES = ["ok", "degraded", "stalled"] as const;
export type MonitoringHeartbeatStatus = (typeof MONITORING_HEARTBEAT_STATUSES)[number];

export type MonitoringHeartbeatPayload = {
  status: MonitoringHeartbeatStatus;
  lagMs: number | null;
  detail: string | null;
};

export type MonitoringHeartbeatEvent = NormalizedEventBase<
  "monitoring_heartbeat",
  MonitoringHeartbeatPayload
> & {
  symbolId: null;
};
