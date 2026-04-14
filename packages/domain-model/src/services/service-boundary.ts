import type { ProductPersistedEntityType } from "../storage/index.js";

export const PRODUCT_SERVICE_NAMES = [
  "monitoring_catalog_service",
  "setup_definition_service",
  "signal_candidate_service",
  "evaluation_service",
  "research_service",
  "research_aggregation_service"
] as const;
export type ProductServiceName = (typeof PRODUCT_SERVICE_NAMES)[number];

export type ProductWritePathOwnership = {
  entityType: ProductPersistedEntityType;
  ownerService: ProductServiceName;
  createPath: string;
  updatePath: string;
};

export const PRODUCT_WRITE_PATH_OWNERSHIP: ProductWritePathOwnership[] = [
  {
    entityType: "monitored_symbol",
    ownerService: "monitoring_catalog_service",
    createPath: "monitoring catalog enrollment",
    updatePath: "monitoring catalog status/metadata updates"
  },
  {
    entityType: "setup_definition",
    ownerService: "setup_definition_service",
    createPath: "research setup authoring flow",
    updatePath: "research setup revision and lifecycle management"
  },
  {
    entityType: "signal_candidate",
    ownerService: "signal_candidate_service",
    createPath: "detection output handoff",
    updatePath: "candidate lifecycle review/disposition updates"
  },
  {
    entityType: "evaluation_result",
    ownerService: "evaluation_service",
    createPath: "evaluation completion flow",
    updatePath: "evaluation status/finality updates"
  },
  {
    entityType: "research_hypothesis",
    ownerService: "research_service",
    createPath: "research hypothesis authoring flow",
    updatePath: "hypothesis lifecycle/evidence updates"
  },
  {
    entityType: "setup_aggregate_result",
    ownerService: "research_aggregation_service",
    createPath: "aggregation computation flow",
    updatePath: "aggregation recomputation/revision flow"
  },
  {
    entityType: "research_feedback_decision",
    ownerService: "research_service",
    createPath: "hypothesis-evidence to setup-review feedback flow",
    updatePath: "feedback decision review lifecycle updates"
  }
];

export const FIRST_PERSISTED_PRODUCT_SLICE = [
  "setup_definition",
  "research_hypothesis"
] as const;
export type FirstPersistedProductSliceEntity = (typeof FIRST_PERSISTED_PRODUCT_SLICE)[number];
