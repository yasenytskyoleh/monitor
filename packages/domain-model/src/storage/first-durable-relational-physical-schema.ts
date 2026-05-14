export const FIRST_DURABLE_RELATIONAL_DATABASE_SCHEMA = "product_domain" as const;

export const FIRST_DURABLE_RELATIONAL_PRISMA_MODELS = {
  setupDefinitionRecord: "SetupDefinitionRecord",
  researchHypothesisRecord: "ResearchHypothesisRecord",
  researchHypothesisSetupDefinitionLinkRecord: "ResearchHypothesisSetupDefinitionLinkRecord"
} as const;
export type FirstDurableRelationalPrismaModelName =
  (typeof FIRST_DURABLE_RELATIONAL_PRISMA_MODELS)[keyof typeof FIRST_DURABLE_RELATIONAL_PRISMA_MODELS];

export const FIRST_DURABLE_RELATIONAL_TABLES = {
  setupDefinition: "setup_definition",
  researchHypothesis: "research_hypothesis",
  researchHypothesisSetupDefinitionLink: "research_hypothesis_setup_definition_link"
} as const;
export type FirstDurableRelationalTableName =
  (typeof FIRST_DURABLE_RELATIONAL_TABLES)[keyof typeof FIRST_DURABLE_RELATIONAL_TABLES];

export const FIRST_DURABLE_RELATIONAL_REQUIRED_COLUMNS = {
  setup_definition: [
    "setup_definition_id",
    "version",
    "lifecycle_status",
    "definition_status",
    "name",
    "description",
    "measurable_conditions",
    "evaluation_assumptions",
    "invalidation_assumptions",
    "origin_run_id",
    "origin_transition_id",
    "created_by_source",
    "last_updated_by_source",
    "trace_id",
    "source_observed_at_utc",
    "metadata_notes",
    "trace_origin_run_id",
    "trace_origin_transition_id",
    "trace_metadata_trace_id",
    "created_at_utc",
    "updated_at_utc",
    "archived_at_utc"
  ],
  research_hypothesis: [
    "research_hypothesis_id",
    "version",
    "lifecycle_status",
    "hypothesis_status",
    "title",
    "description",
    "assumptions",
    "notes",
    "evidence_status",
    "evidence_summary",
    "last_evidence_aggregate_result_id",
    "last_evidence_assessed_at",
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
  research_hypothesis_setup_definition_link: [
    "research_hypothesis_id",
    "setup_definition_id",
    "linked_at_utc"
  ]
} as const;

export const FIRST_DURABLE_RELATIONAL_INDEXES = [
  "idx_setup_definition_definition_status",
  "idx_setup_definition_lifecycle_status",
  "idx_research_hypothesis_hypothesis_status",
  "idx_research_hypothesis_lifecycle_status",
  "idx_research_hypothesis_link_setup_definition_id"
] as const;
export type FirstDurableRelationalIndexName =
  (typeof FIRST_DURABLE_RELATIONAL_INDEXES)[number];

export const FIRST_DURABLE_RELATIONAL_MIGRATION_SLUG =
  "product_domain_relational_v1_init" as const;
