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
  },
  {
    entityType: "research_decision_approval",
    ownerService: "research_service",
    createPath: "manual review approval submission flow",
    updatePath: "approval artifact metadata corrections in controlled review path"
  },
  {
    entityType: "research_review_decision",
    ownerService: "research_service",
    createPath: "research review packet resolution flow",
    updatePath: "review decision audit metadata corrections in controlled review path"
  },
  {
    entityType: "routed_action_execution_envelope",
    ownerService: "research_service",
    createPath: "review-decision downstream action execution envelope preparation flow",
    updatePath: "execution-envelope audit metadata corrections in controlled review-execution path"
  },
  {
    entityType: "setup_lifecycle_mutation_record",
    ownerService: "setup_definition_service",
    createPath: "approved setup lifecycle mutation flow",
    updatePath: "mutation audit metadata corrections in controlled setup review path"
  },
  {
    entityType: "setup_refinement_request",
    ownerService: "research_service",
    createPath: "approved refine_definition follow-up request flow",
    updatePath: "refinement request workflow/status updates in controlled research review path"
  },
  {
    entityType: "setup_definition_revision",
    ownerService: "setup_definition_service",
    createPath: "setup refinement request to setup definition revision flow",
    updatePath: "revision status metadata updates in controlled setup revision review path"
  },
  {
    entityType: "setup_revision_activation_record",
    ownerService: "setup_definition_service",
    createPath: "setup revision explicit activation and superseding flow",
    updatePath: "activation audit metadata corrections in controlled setup revision activation path"
  }
];

export const FIRST_PERSISTED_PRODUCT_SLICE = [
  "setup_definition",
  "research_hypothesis"
] as const;
export type FirstPersistedProductSliceEntity = (typeof FIRST_PERSISTED_PRODUCT_SLICE)[number];
