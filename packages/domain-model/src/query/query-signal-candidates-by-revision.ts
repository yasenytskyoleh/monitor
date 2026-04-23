import type { SignalCandidateStatus } from "../signal-candidate.js";
import type { QueryTimeRange } from "./query-setup-revision-history.js";

export type QuerySignalCandidatesByRevision = {
  setupRevisionId: string;
  setupFamilyId?: string;
  statuses?: SignalCandidateStatus[];
  symbolId?: string;
  timeRange?: QueryTimeRange;
};
