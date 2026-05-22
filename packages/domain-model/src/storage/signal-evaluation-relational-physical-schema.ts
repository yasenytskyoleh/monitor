export const SIGNAL_EVALUATION_RELATIONAL_PRISMA_MODELS = {
  signalCandidateRecord: "SignalCandidateRecord",
  evaluationResultRecord: "EvaluationResultRecord"
} as const;
export type SignalEvaluationRelationalPrismaModelName =
  (typeof SIGNAL_EVALUATION_RELATIONAL_PRISMA_MODELS)[keyof typeof SIGNAL_EVALUATION_RELATIONAL_PRISMA_MODELS];

export const SIGNAL_EVALUATION_RELATIONAL_TABLES = {
  signalCandidate: "signal_candidate",
  evaluationResult: "evaluation_result"
} as const;
export type SignalEvaluationRelationalTableName =
  (typeof SIGNAL_EVALUATION_RELATIONAL_TABLES)[keyof typeof SIGNAL_EVALUATION_RELATIONAL_TABLES];

export const SIGNAL_EVALUATION_RELATIONAL_REQUIRED_COLUMNS = {
  signal_candidate: [
    "signal_candidate_id",
    "version",
    "lifecycle_status",
    "candidate_status",
    "setup_definition_id",
    "setup_revision_id",
    "monitored_symbol_id",
    "detection_hit_id",
    "detected_at_utc",
    "evidence_summary",
    "candidate_origin_run_id",
    "origin_run_id",
    "origin_transition_id",
    "created_by_source",
    "last_updated_by_source",
    "trace_id",
    "source_observed_at_utc",
    "metadata_notes",
    "created_at_utc",
    "updated_at_utc",
    "archived_at_utc"
  ],
  evaluation_result: [
    "evaluation_result_id",
    "version",
    "lifecycle_status",
    "evaluation_status",
    "signal_candidate_id",
    "evaluation_window_id",
    "reference_price",
    "final_price",
    "high_in_window",
    "low_in_window",
    "absolute_move",
    "percentage_move",
    "max_favorable_excursion",
    "max_adverse_excursion",
    "evaluated_at_utc",
    "notes",
    "origin_run_id",
    "origin_transition_id",
    "created_by_source",
    "last_updated_by_source",
    "trace_id",
    "source_observed_at_utc",
    "metadata_notes",
    "created_at_utc",
    "updated_at_utc",
    "archived_at_utc"
  ]
} as const;

export const SIGNAL_EVALUATION_RELATIONAL_INDEXES = [
  "idx_signal_candidate_setup_definition_id",
  "idx_signal_candidate_monitored_symbol_id",
  "idx_signal_candidate_candidate_status",
  "idx_evaluation_result_signal_candidate_id",
  "idx_evaluation_result_evaluation_window_id",
  "idx_evaluation_result_evaluation_status"
] as const;
export type SignalEvaluationRelationalIndexName =
  (typeof SIGNAL_EVALUATION_RELATIONAL_INDEXES)[number];

export const SIGNAL_EVALUATION_RELATIONAL_UNIQUE_CONSTRAINTS = [
  "uq_evaluation_result_candidate_window"
] as const;
export type SignalEvaluationRelationalUniqueConstraintName =
  (typeof SIGNAL_EVALUATION_RELATIONAL_UNIQUE_CONSTRAINTS)[number];

export const SIGNAL_EVALUATION_RELATIONAL_MIGRATION_SLUG =
  "product_domain_signal_evaluation_relational_v1" as const;
