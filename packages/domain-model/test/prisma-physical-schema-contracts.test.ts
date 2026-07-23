import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  FIRST_DURABLE_RELATIONAL_DATABASE_SCHEMA,
  FIRST_DURABLE_RELATIONAL_INDEXES,
  FIRST_DURABLE_RELATIONAL_MIGRATION_SLUG,
  FIRST_DURABLE_RELATIONAL_PRISMA_MODELS,
  FIRST_DURABLE_RELATIONAL_REQUIRED_COLUMNS,
  FIRST_DURABLE_RELATIONAL_TABLES,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_INDEXES,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_MIGRATION_SLUG,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_PRISMA_MODELS,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_REQUIRED_COLUMNS,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_TABLES,
  RESEARCH_DECISION_APPROVAL_RELATIONAL_UNIQUE_CONSTRAINTS,
  RESEARCH_REVIEW_DECISION_RELATIONAL_INDEXES,
  RESEARCH_REVIEW_DECISION_RELATIONAL_MIGRATION_SLUG,
  RESEARCH_REVIEW_DECISION_RELATIONAL_PRISMA_MODELS,
  RESEARCH_REVIEW_DECISION_RELATIONAL_REQUIRED_COLUMNS,
  RESEARCH_REVIEW_DECISION_RELATIONAL_TABLES,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_INDEXES,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_MIGRATION_SLUG,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_PRISMA_MODELS,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_REQUIRED_COLUMNS,
  REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_TABLES,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_INDEXES,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_MIGRATION_SLUG,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_PRISMA_MODELS,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_REQUIRED_COLUMNS,
  ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_TABLES,
  SETUP_DEFINITION_REVISION_RELATIONAL_INDEXES,
  SETUP_DEFINITION_REVISION_RELATIONAL_MIGRATION_SLUG,
  SETUP_DEFINITION_REVISION_RELATIONAL_PRISMA_MODELS,
  SETUP_DEFINITION_REVISION_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_DEFINITION_REVISION_RELATIONAL_TABLES,
  SETUP_DEFINITION_REVISION_RELATIONAL_UNIQUE_CONSTRAINTS,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_INDEXES,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_MIGRATION_SLUG,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_PRISMA_MODELS,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_TABLES,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_INDEXES,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_MIGRATION_SLUG,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_PRISMA_MODELS,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_REFINEMENT_REQUEST_RELATIONAL_TABLES,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_INDEXES,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_MIGRATION_SLUG,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_PRISMA_MODELS,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_TABLES,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_INDEXES,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_MIGRATION_SLUG,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_PRISMA_MODELS,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_REQUIRED_COLUMNS,
  RESEARCH_FEEDBACK_DECISION_RELATIONAL_TABLES,
  SIGNAL_EVALUATION_RELATIONAL_INDEXES,
  SIGNAL_EVALUATION_RELATIONAL_MIGRATION_SLUG,
  SIGNAL_EVALUATION_RELATIONAL_PRISMA_MODELS,
  SIGNAL_EVALUATION_RELATIONAL_REQUIRED_COLUMNS,
  SIGNAL_EVALUATION_RELATIONAL_TABLES,
  SIGNAL_EVALUATION_RELATIONAL_UNIQUE_CONSTRAINTS,
  SETUP_AGGREGATE_RELATIONAL_INDEXES,
  SETUP_AGGREGATE_RELATIONAL_MIGRATION_SLUG,
  SETUP_AGGREGATE_RELATIONAL_PRISMA_MODELS,
  SETUP_AGGREGATE_RELATIONAL_REQUIRED_COLUMNS,
  SETUP_AGGREGATE_RELATIONAL_TABLES,
  SETUP_AGGREGATE_RELATIONAL_UNIQUE_CONSTRAINTS
} from "../src/index.js";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(testDirectory, "..");
const schemaPath = join(packageRoot, "prisma", "schema.prisma");
const migrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260512235500_product_domain_relational_v1_init",
  "migration.sql"
);
const signalEvaluationMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260522101500_product_domain_signal_evaluation_relational_v1",
  "migration.sql"
);
const setupAggregateMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260522153000_product_domain_setup_aggregate_relational_v1",
  "migration.sql"
);
const researchFeedbackDecisionMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260523091500_product_domain_research_feedback_decision_relational_v1",
  "migration.sql"
);
const researchDecisionApprovalMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260527103000_product_domain_research_decision_approval_relational_v1",
  "migration.sql"
);
const researchReviewDecisionMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260630113000_product_domain_research_review_decision_relational_v1",
  "migration.sql"
);
const routedActionExecutionEnvelopeMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260702103000_product_domain_routed_action_execution_envelope_relational_v1",
  "migration.sql"
);
const setupLifecycleMutationRecordMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260706113000_product_domain_setup_lifecycle_mutation_record_relational_v1",
  "migration.sql"
);
const setupRefinementRequestMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260706143000_product_domain_setup_refinement_request_relational_v1",
  "migration.sql"
);
const setupDefinitionRevisionMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260708101500_product_domain_setup_definition_revision_relational_v1",
  "migration.sql"
);
const setupRevisionActivationRecordMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260711103000_product_domain_setup_revision_activation_record_relational_v1",
  "migration.sql"
);
const reviewDecisionRoutingResultMigrationPath = join(
  packageRoot,
  "prisma",
  "migrations",
  "20260723103000_product_domain_review_decision_routing_result_relational_v1",
  "migration.sql"
);

test("exposes first durable relational physical schema constants", () => {
  assert.equal(FIRST_DURABLE_RELATIONAL_DATABASE_SCHEMA, "product_domain");
  assert.equal(FIRST_DURABLE_RELATIONAL_MIGRATION_SLUG, "product_domain_relational_v1_init");
  assert.equal(FIRST_DURABLE_RELATIONAL_PRISMA_MODELS.setupDefinitionRecord, "SetupDefinitionRecord");
  assert.equal(FIRST_DURABLE_RELATIONAL_TABLES.setupDefinition, "setup_definition");
  assert.equal(
    FIRST_DURABLE_RELATIONAL_REQUIRED_COLUMNS.research_hypothesis_setup_definition_link.includes(
      "linked_at_utc"
    ),
    true
  );
  assert.equal(
    FIRST_DURABLE_RELATIONAL_INDEXES.includes("idx_research_hypothesis_hypothesis_status"),
    true
  );
});

test("prisma schema defines the first durable relational models in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /schemas\s+=\s+\["product_domain"\]/);
  assert.match(schema, /model SetupDefinitionRecord \{/);
  assert.match(schema, /model ResearchHypothesisRecord \{/);
  assert.match(schema, /model ResearchHypothesisSetupDefinitionLinkRecord \{/);
  assert.match(schema, /@@map\("setup_definition"\)/);
  assert.match(schema, /@@map\("research_hypothesis"\)/);
  assert.match(schema, /@@map\("research_hypothesis_setup_definition_link"\)/);
  assert.match(schema, /@@schema\("product_domain"\)/);

  for (const tableName of Object.values(FIRST_DURABLE_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(FIRST_DURABLE_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the first durable relational tables, indexes, and key constraints", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS "product_domain";/);

  for (const tableName of Object.values(FIRST_DURABLE_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of FIRST_DURABLE_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(FIRST_DURABLE_RELATIONAL_REQUIRED_COLUMNS)) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /PRIMARY KEY \("research_hypothesis_id", "setup_definition_id"\)/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /CHECK \(cardinality\("measurable_conditions"\) > 0\)/
  );
  assert.match(
    migration,
    /CHECK \(cardinality\("assumptions"\) > 0\)/
  );
});

test("exposes signal/evaluation physical schema constants", () => {
  assert.equal(
    SIGNAL_EVALUATION_RELATIONAL_MIGRATION_SLUG,
    "product_domain_signal_evaluation_relational_v1"
  );
  assert.equal(
    SIGNAL_EVALUATION_RELATIONAL_PRISMA_MODELS.signalCandidateRecord,
    "SignalCandidateRecord"
  );
  assert.equal(SIGNAL_EVALUATION_RELATIONAL_TABLES.signalCandidate, "signal_candidate");
  assert.equal(
    SIGNAL_EVALUATION_RELATIONAL_REQUIRED_COLUMNS.evaluation_result.includes("evaluation_status"),
    true
  );
  assert.equal(
    SIGNAL_EVALUATION_RELATIONAL_UNIQUE_CONSTRAINTS.includes(
      "uq_evaluation_result_candidate_window"
    ),
    true
  );
});

test("prisma schema defines the signal/evaluation relational models and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum SignalCandidateStatus \{/);
  assert.match(schema, /enum EvaluationStatus \{/);
  assert.match(schema, /model SignalCandidateRecord \{/);
  assert.match(schema, /model EvaluationResultRecord \{/);
  assert.match(schema, /@@map\("signal_candidate"\)/);
  assert.match(schema, /@@map\("evaluation_result"\)/);

  for (const tableName of Object.values(SIGNAL_EVALUATION_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(SIGNAL_EVALUATION_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the signal/evaluation relational tables, indexes, and key constraints", async () => {
  const migration = await readFile(signalEvaluationMigrationPath, "utf8");

  for (const tableName of Object.values(SIGNAL_EVALUATION_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of SIGNAL_EVALUATION_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const uniqueConstraintName of SIGNAL_EVALUATION_RELATIONAL_UNIQUE_CONSTRAINTS) {
    assert.equal(migration.includes(`CREATE UNIQUE INDEX "${uniqueConstraintName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(SIGNAL_EVALUATION_RELATIONAL_REQUIRED_COLUMNS)) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("signal_candidate_id"\)\s+REFERENCES "product_domain"\."signal_candidate"/
  );
  assert.match(
    migration,
    /CHECK \(length\(trim\("evidence_summary"\)\) > 0\)/
  );
  assert.match(
    migration,
    /CHECK \(\s*"evaluation_status" <> 'completed' OR \(\s*"reference_price" IS NOT NULL/
  );
});

test("exposes setup-aggregate physical schema constants", () => {
  assert.equal(
    SETUP_AGGREGATE_RELATIONAL_MIGRATION_SLUG,
    "product_domain_setup_aggregate_relational_v1"
  );
  assert.equal(
    SETUP_AGGREGATE_RELATIONAL_PRISMA_MODELS.setupAggregateResultRecord,
    "SetupAggregateResultRecord"
  );
  assert.equal(SETUP_AGGREGATE_RELATIONAL_TABLES.setupAggregateResult, "setup_aggregate_result");
  assert.equal(
    SETUP_AGGREGATE_RELATIONAL_REQUIRED_COLUMNS.setup_aggregate_result.includes("scope_key"),
    true
  );
  assert.equal(
    SETUP_AGGREGATE_RELATIONAL_UNIQUE_CONSTRAINTS.includes(
      "uq_setup_aggregate_result_scope_key"
    ),
    true
  );
});

test("prisma schema defines the setup-aggregate relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum AggregateComputationStatus \{/);
  assert.match(schema, /enum AggregationSymbolScopeKind \{/);
  assert.match(schema, /model SetupAggregateResultRecord \{/);
  assert.match(schema, /@@map\("setup_aggregate_result"\)/);

  for (const tableName of Object.values(SETUP_AGGREGATE_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(SETUP_AGGREGATE_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the setup-aggregate relational table, indexes, and key constraints", async () => {
  const migration = await readFile(setupAggregateMigrationPath, "utf8");

  for (const tableName of Object.values(SETUP_AGGREGATE_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of SETUP_AGGREGATE_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const uniqueConstraintName of SETUP_AGGREGATE_RELATIONAL_UNIQUE_CONSTRAINTS) {
    assert.equal(migration.includes(`CREATE UNIQUE INDEX "${uniqueConstraintName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(SETUP_AGGREGATE_RELATIONAL_REQUIRED_COLUMNS)) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("research_hypothesis_id"\)\s+REFERENCES "product_domain"\."research_hypothesis"/
  );
  assert.match(
    migration,
    /CHECK \(\s*"aggregate_status" <> 'pending' OR \(\s*"total_candidates" = 0/
  );
  assert.match(
    migration,
    /CHECK \(\s*"aggregate_status" <> 'completed' OR \(\s*"average_percentage_move" IS NOT NULL/
  );
});

test("exposes research-feedback-decision physical schema constants", () => {
  assert.equal(
    RESEARCH_FEEDBACK_DECISION_RELATIONAL_MIGRATION_SLUG,
    "product_domain_research_feedback_decision_relational_v1"
  );
  assert.equal(
    RESEARCH_FEEDBACK_DECISION_RELATIONAL_PRISMA_MODELS.researchFeedbackDecisionRecord,
    "ResearchFeedbackDecisionRecord"
  );
  assert.equal(
    RESEARCH_FEEDBACK_DECISION_RELATIONAL_TABLES.researchFeedbackDecision,
    "research_feedback_decision"
  );
  assert.equal(
    RESEARCH_FEEDBACK_DECISION_RELATIONAL_REQUIRED_COLUMNS.research_feedback_decision.includes(
      "reviewer_metadata"
    ),
    true
  );
  assert.equal(
    RESEARCH_FEEDBACK_DECISION_RELATIONAL_INDEXES.includes(
      "idx_research_feedback_decision_decision_status"
    ),
    true
  );
});

test("prisma schema defines the research-feedback-decision relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum ResearchFeedbackDecisionAction \{/);
  assert.match(schema, /enum ResearchFeedbackDecisionStatus \{/);
  assert.match(schema, /model ResearchFeedbackDecisionRecord \{/);
  assert.match(schema, /@@map\("research_feedback_decision"\)/);

  for (const tableName of Object.values(RESEARCH_FEEDBACK_DECISION_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(RESEARCH_FEEDBACK_DECISION_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the research-feedback-decision relational table, indexes, and key constraints", async () => {
  const migration = await readFile(researchFeedbackDecisionMigrationPath, "utf8");

  for (const tableName of Object.values(RESEARCH_FEEDBACK_DECISION_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of RESEARCH_FEEDBACK_DECISION_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(
    RESEARCH_FEEDBACK_DECISION_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("research_hypothesis_id"\)\s+REFERENCES "product_domain"\."research_hypothesis"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("setup_aggregate_result_id"\)\s+REFERENCES "product_domain"\."setup_aggregate_result"/
  );
  assert.match(
    migration,
    /CHECK \(\s*length\(trim\("rationale_summary"\)\) > 0/
  );
  assert.match(
    migration,
    /"requires_manual_review" = TRUE/
  );
  assert.match(
    migration,
    /"decision_status" = 'proposed' AND\s+"reviewer_metadata" IS NULL/
  );
});

test("exposes research-decision-approval physical schema constants", () => {
  assert.equal(
    RESEARCH_DECISION_APPROVAL_RELATIONAL_MIGRATION_SLUG,
    "product_domain_research_decision_approval_relational_v1"
  );
  assert.equal(
    RESEARCH_DECISION_APPROVAL_RELATIONAL_PRISMA_MODELS.researchDecisionApprovalRecord,
    "ResearchDecisionApprovalRecord"
  );
  assert.equal(
    RESEARCH_DECISION_APPROVAL_RELATIONAL_TABLES.researchDecisionApproval,
    "research_decision_approval"
  );
  assert.equal(
    RESEARCH_DECISION_APPROVAL_RELATIONAL_REQUIRED_COLUMNS.research_decision_approval.includes(
      "authorized_next_action"
    ),
    true
  );
  assert.equal(
    RESEARCH_DECISION_APPROVAL_RELATIONAL_INDEXES.includes(
      "idx_research_decision_approval_setup_definition_id"
    ),
    true
  );
  assert.equal(
    RESEARCH_DECISION_APPROVAL_RELATIONAL_UNIQUE_CONSTRAINTS.includes(
      "uq_research_decision_approval_feedback_decision_id"
    ),
    true
  );
});

test("prisma schema defines the research-decision-approval relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum ResearchDecisionApprovalStatus \{/);
  assert.match(schema, /enum ResearchDecisionApprovalOutcome \{/);
  assert.match(schema, /model ResearchDecisionApprovalRecord \{/);
  assert.match(schema, /@@map\("research_decision_approval"\)/);
  assert.match(
    schema,
    /@@unique\(\[researchFeedbackDecisionId\], map: "uq_research_decision_approval_feedback_decision_id"\)/
  );

  for (const tableName of Object.values(RESEARCH_DECISION_APPROVAL_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(RESEARCH_DECISION_APPROVAL_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the research-decision-approval relational table, indexes, and key constraints", async () => {
  const migration = await readFile(researchDecisionApprovalMigrationPath, "utf8");

  for (const tableName of Object.values(RESEARCH_DECISION_APPROVAL_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of RESEARCH_DECISION_APPROVAL_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const uniqueConstraintName of RESEARCH_DECISION_APPROVAL_RELATIONAL_UNIQUE_CONSTRAINTS) {
    assert.equal(
      migration.includes(`CREATE UNIQUE INDEX "${uniqueConstraintName}"`),
      true
    );
  }

  for (const [tableName, columns] of Object.entries(
    RESEARCH_DECISION_APPROVAL_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("research_feedback_decision_id"\)\s+REFERENCES "product_domain"\."research_feedback_decision"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /CHECK \(\s*length\(trim\("reviewed_by"\)\) > 0/
  );
  assert.match(
    migration,
    /"approval_outcome" = 'approved' AND\s+"authorized_next_action" IS NOT NULL/
  );
  assert.match(
    migration,
    /"created_at_utc" <= "reviewed_at_utc" AND\s+"updated_at_utc" >= "reviewed_at_utc"/
  );
});

test("exposes research-review-decision physical schema constants", () => {
  assert.equal(
    RESEARCH_REVIEW_DECISION_RELATIONAL_MIGRATION_SLUG,
    "product_domain_research_review_decision_relational_v1"
  );
  assert.equal(
    RESEARCH_REVIEW_DECISION_RELATIONAL_PRISMA_MODELS.researchReviewDecisionRecord,
    "ResearchReviewDecisionRecord"
  );
  assert.equal(
    RESEARCH_REVIEW_DECISION_RELATIONAL_TABLES.researchReviewDecision,
    "research_review_decision"
  );
  assert.equal(
    RESEARCH_REVIEW_DECISION_RELATIONAL_REQUIRED_COLUMNS.research_review_decision.includes(
      "research_review_packet_id"
    ),
    true
  );
  assert.equal(
    RESEARCH_REVIEW_DECISION_RELATIONAL_INDEXES.includes(
      "idx_research_review_decision_review_packet_id"
    ),
    true
  );
});

test("prisma schema defines the research-review-decision relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum ResearchReviewAuthorizedNextAction \{/);
  assert.match(schema, /enum ResearchReviewDecisionStatus \{/);
  assert.match(schema, /enum ResearchReviewDecisionOutcome \{/);
  assert.match(schema, /model ResearchReviewDecisionRecord \{/);
  assert.match(schema, /@@map\("research_review_decision"\)/);

  for (const tableName of Object.values(RESEARCH_REVIEW_DECISION_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(RESEARCH_REVIEW_DECISION_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the research-review-decision relational table, indexes, and key constraints", async () => {
  const migration = await readFile(researchReviewDecisionMigrationPath, "utf8");

  for (const tableName of Object.values(RESEARCH_REVIEW_DECISION_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of RESEARCH_REVIEW_DECISION_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(
    RESEARCH_REVIEW_DECISION_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("research_hypothesis_id"\)\s+REFERENCES "product_domain"\."research_hypothesis"/
  );
  assert.match(
    migration,
    /CHECK \(\s*length\(trim\("research_review_packet_id"\)\) > 0/
  );
  assert.match(
    migration,
    /"decision_outcome" = 'revise' AND\s+"authorized_next_action" = 'prepare_refinement_follow_up'/
  );
  assert.match(
    migration,
    /"created_at_utc" <= "reviewed_at_utc" AND\s+"updated_at_utc" >= "reviewed_at_utc"/
  );
});

test("exposes review-decision-routing-result physical schema constants", () => {
  assert.equal(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_MIGRATION_SLUG,
    "product_domain_review_decision_routing_result_relational_v1"
  );
  assert.equal(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_PRISMA_MODELS.reviewDecisionRoutingResult,
    "ReviewDecisionRoutingResultRecord"
  );
  assert.equal(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_TABLES.reviewDecisionRoutingResult,
    "review_decision_routing_result"
  );
  assert.equal(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_REQUIRED_COLUMNS
      .review_decision_routing_result.includes("downstream_command_type"),
    true
  );
  assert.equal(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_INDEXES.includes(
      "idx_review_decision_routing_result_family_routed_at_utc"
    ),
    true
  );
});

test("prisma schema defines the review-decision-routing-result relational model and enum", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum ReviewDecisionRoutingStatus \{/);
  assert.match(schema, /model ReviewDecisionRoutingResultRecord \{/);
  assert.match(schema, /@@map\("review_decision_routing_result"\)/);

  for (const tableName of Object.values(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_TABLES
  )) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_PRISMA_MODELS
  )) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the review-decision-routing-result relational table, indexes, and key constraints", async () => {
  const migration = await readFile(reviewDecisionRoutingResultMigrationPath, "utf8");

  for (const tableName of Object.values(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_TABLES
  )) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(
    REVIEW_DECISION_ROUTING_RESULT_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("research_review_decision_id"\)\s+REFERENCES "product_domain"\."research_review_decision"/
  );
  assert.match(migration, /CHECK \(\s*jsonb_typeof\("warnings"\) = 'array'/);
  assert.match(
    migration,
    /"created_at_utc" <= "routed_at_utc" AND\s+"updated_at_utc" >= "routed_at_utc"/
  );
});

test("exposes routed-action-execution-envelope physical schema constants", () => {
  assert.equal(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_MIGRATION_SLUG,
    "product_domain_routed_action_execution_envelope_relational_v1"
  );
  assert.equal(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_PRISMA_MODELS
      .routedActionExecutionEnvelopeRecord,
    "RoutedActionExecutionEnvelopeRecord"
  );
  assert.equal(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_TABLES.routedActionExecutionEnvelope,
    "routed_action_execution_envelope"
  );
  assert.equal(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_REQUIRED_COLUMNS
      .routed_action_execution_envelope.includes("execution_payload_snapshot"),
    true
  );
  assert.equal(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_INDEXES.includes(
      "idx_routed_action_execution_envelope_source_review_decision_id"
    ),
    true
  );
});

test("prisma schema defines the routed-action-execution-envelope relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum DownstreamActionTarget \{/);
  assert.match(schema, /enum ReviewDecisionDownstreamCommandType \{/);
  assert.match(schema, /enum RoutedActionExecutionStatus \{/);
  assert.match(schema, /model RoutedActionExecutionEnvelopeRecord \{/);
  assert.match(schema, /@@map\("routed_action_execution_envelope"\)/);

  for (const tableName of Object.values(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_TABLES
  )) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_PRISMA_MODELS
  )) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the routed-action-execution-envelope relational table, indexes, and key constraints", async () => {
  const migration = await readFile(routedActionExecutionEnvelopeMigrationPath, "utf8");

  for (const tableName of Object.values(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_TABLES
  )) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(
    ROUTED_ACTION_EXECUTION_ENVELOPE_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("source_review_decision_id"\)\s+REFERENCES "product_domain"\."research_review_decision"/
  );
  assert.match(
    migration,
    /CHECK \(\s*jsonb_typeof\("target_entity_refs"\) = 'object'/
  );
  assert.match(
    migration,
    /"action_target" = 'create_setup_refinement_request' AND\s+"action_command_type" = 'CreateSetupRefinementRequestCommand'/
  );
  assert.match(
    migration,
    /"created_at_utc" <= "prepared_at_utc" AND\s+"updated_at_utc" >= "prepared_at_utc"/
  );
});

test("exposes setup-lifecycle-mutation-record physical schema constants", () => {
  assert.equal(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_MIGRATION_SLUG,
    "product_domain_setup_lifecycle_mutation_record_relational_v1"
  );
  assert.equal(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_PRISMA_MODELS.setupLifecycleMutationRecord,
    "SetupLifecycleMutationRecordRecord"
  );
  assert.equal(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_TABLES.setupLifecycleMutationRecord,
    "setup_lifecycle_mutation_record"
  );
  assert.equal(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_REQUIRED_COLUMNS
      .setup_lifecycle_mutation_record.includes("approved_action"),
    true
  );
  assert.equal(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_INDEXES.includes(
      "idx_setup_lifecycle_mutation_record_approval_id"
    ),
    true
  );
});

test("prisma schema defines the setup-lifecycle-mutation-record relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum ApprovedSetupLifecycleAction \{/);
  assert.match(schema, /model SetupLifecycleMutationRecordRecord \{/);
  assert.match(schema, /@@map\("setup_lifecycle_mutation_record"\)/);

  for (const tableName of Object.values(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_TABLES
  )) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_PRISMA_MODELS
  )) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the setup-lifecycle-mutation-record relational table, indexes, and key constraints", async () => {
  const migration = await readFile(setupLifecycleMutationRecordMigrationPath, "utf8");

  for (const tableName of Object.values(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_TABLES
  )) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(
    SETUP_LIFECYCLE_MUTATION_RECORD_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("research_decision_approval_id"\)\s+REFERENCES "product_domain"\."research_decision_approval"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("research_feedback_decision_id"\)\s+REFERENCES "product_domain"\."research_feedback_decision"/
  );
  assert.match(
    migration,
    /"approved_action" = 'pause_setup' AND\s+"new_status" = 'paused'/
  );
  assert.match(
    migration,
    /"created_at_utc" <= "mutated_at_utc" AND\s+"updated_at_utc" >= "mutated_at_utc"/
  );
});

test("exposes setup-refinement-request physical schema constants", () => {
  assert.equal(
    SETUP_REFINEMENT_REQUEST_RELATIONAL_MIGRATION_SLUG,
    "product_domain_setup_refinement_request_relational_v1"
  );
  assert.equal(
    SETUP_REFINEMENT_REQUEST_RELATIONAL_PRISMA_MODELS.setupRefinementRequest,
    "SetupRefinementRequestRecord"
  );
  assert.equal(
    SETUP_REFINEMENT_REQUEST_RELATIONAL_TABLES.setupRefinementRequest,
    "setup_refinement_request"
  );
  assert.equal(
    SETUP_REFINEMENT_REQUEST_RELATIONAL_REQUIRED_COLUMNS
      .setup_refinement_request.includes("requested_changes_summary"),
    true
  );
  assert.equal(
    SETUP_REFINEMENT_REQUEST_RELATIONAL_INDEXES.includes(
      "idx_setup_refinement_request_approval_id"
    ),
    true
  );
});

test("prisma schema defines the setup-refinement-request relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum SetupRefinementStatus \{/);
  assert.match(schema, /model SetupRefinementRequestRecord \{/);
  assert.match(schema, /@@map\("setup_refinement_request"\)/);

  for (const tableName of Object.values(SETUP_REFINEMENT_REQUEST_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(SETUP_REFINEMENT_REQUEST_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the setup-refinement-request relational table, indexes, and key constraints", async () => {
  const migration = await readFile(setupRefinementRequestMigrationPath, "utf8");

  for (const tableName of Object.values(SETUP_REFINEMENT_REQUEST_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of SETUP_REFINEMENT_REQUEST_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(
    SETUP_REFINEMENT_REQUEST_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("source_research_decision_approval_id"\)\s+REFERENCES "product_domain"\."research_decision_approval"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("source_research_feedback_decision_id"\)\s+REFERENCES "product_domain"\."research_feedback_decision"/
  );
  assert.match(migration, /length\(trim\("requested_changes_summary"\)\) > 0/);
  assert.match(
    migration,
    /"created_at_utc" <= "requested_at_utc" AND\s+"updated_at_utc" >= "requested_at_utc"/
  );
});

test("exposes setup-definition-revision physical schema constants", () => {
  assert.equal(
    SETUP_DEFINITION_REVISION_RELATIONAL_MIGRATION_SLUG,
    "product_domain_setup_definition_revision_relational_v1"
  );
  assert.equal(
    SETUP_DEFINITION_REVISION_RELATIONAL_PRISMA_MODELS.setupDefinitionRevision,
    "SetupDefinitionRevisionRecord"
  );
  assert.equal(
    SETUP_DEFINITION_REVISION_RELATIONAL_TABLES.setupDefinitionRevision,
    "setup_definition_revision"
  );
  assert.equal(
    SETUP_DEFINITION_REVISION_RELATIONAL_REQUIRED_COLUMNS
      .setup_definition_revision.includes("setup_version_number"),
    true
  );
  assert.equal(
    SETUP_DEFINITION_REVISION_RELATIONAL_UNIQUE_CONSTRAINTS.includes(
      "uq_setup_definition_revision_family_version"
    ),
    true
  );
});

test("prisma schema defines the setup-definition-revision relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum SetupDefinitionRevisionStatus \{/);
  assert.match(schema, /model SetupDefinitionRevisionRecord \{/);
  assert.match(schema, /@@map\("setup_definition_revision"\)/);

  for (const tableName of Object.values(SETUP_DEFINITION_REVISION_RELATIONAL_TABLES)) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(SETUP_DEFINITION_REVISION_RELATIONAL_PRISMA_MODELS)) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the setup-definition-revision relational table, indexes, and key constraints", async () => {
  const migration = await readFile(setupDefinitionRevisionMigrationPath, "utf8");

  for (const tableName of Object.values(SETUP_DEFINITION_REVISION_RELATIONAL_TABLES)) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of SETUP_DEFINITION_REVISION_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const uniqueConstraint of SETUP_DEFINITION_REVISION_RELATIONAL_UNIQUE_CONSTRAINTS) {
    assert.equal(migration.includes(`CONSTRAINT "${uniqueConstraint}"`), true);
  }

  for (const [tableName, columns] of Object.entries(
    SETUP_DEFINITION_REVISION_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("previous_setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("source_setup_refinement_request_id"\)\s+REFERENCES "product_domain"\."setup_refinement_request"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("source_research_decision_approval_id"\)\s+REFERENCES "product_domain"\."research_decision_approval"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("source_research_feedback_decision_id"\)\s+REFERENCES "product_domain"\."research_feedback_decision"/
  );
  assert.match(
    migration,
    /"previous_setup_definition_id" IS NULL OR\s+"previous_setup_definition_id" <> "setup_definition_id"/
  );
  assert.match(migration, /length\(trim\("changed_fields_summary"\)\) > 0/);
  assert.match(migration, /"setup_version_number" > 0/);
});

test("exposes setup-revision-activation-record physical schema constants", () => {
  assert.equal(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_MIGRATION_SLUG,
    "product_domain_setup_revision_activation_record_relational_v1"
  );
  assert.equal(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_PRISMA_MODELS.setupRevisionActivationRecord,
    "SetupRevisionActivationRecordRecord"
  );
  assert.equal(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_TABLES.setupRevisionActivationRecord,
    "setup_revision_activation_record"
  );
  assert.equal(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_REQUIRED_COLUMNS
      .setup_revision_activation_record.includes("activation_outcome"),
    true
  );
  assert.equal(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_INDEXES.includes(
      "idx_setup_revision_activation_record_target_revision_id"
    ),
    true
  );
});

test("prisma schema defines the setup-revision-activation-record relational model and enums in product_domain", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /enum SetupRevisionActivationRecordOutcome \{/);
  assert.match(schema, /model SetupRevisionActivationRecordRecord \{/);
  assert.match(schema, /@@map\("setup_revision_activation_record"\)/);

  for (const tableName of Object.values(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_TABLES
  )) {
    assert.equal(schema.includes(`@@map("${tableName}")`), true);
  }

  for (const modelName of Object.values(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_PRISMA_MODELS
  )) {
    assert.equal(schema.includes(`model ${modelName} {`), true);
  }
});

test("migration creates the setup-revision-activation-record relational table, indexes, and key constraints", async () => {
  const migration = await readFile(setupRevisionActivationRecordMigrationPath, "utf8");

  for (const tableName of Object.values(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_TABLES
  )) {
    assert.equal(
      migration.includes(`CREATE TABLE "product_domain"."${tableName}"`),
      true
    );
  }

  for (const indexName of SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_INDEXES) {
    assert.equal(migration.includes(`CREATE INDEX "${indexName}"`), true);
  }

  for (const [tableName, columns] of Object.entries(
    SETUP_REVISION_ACTIVATION_RECORD_RELATIONAL_REQUIRED_COLUMNS
  )) {
    for (const columnName of columns) {
      assert.equal(
        migration.includes(`"${columnName}"`),
        true,
        `${tableName} is missing ${columnName}`
      );
    }
  }

  assert.match(
    migration,
    /FOREIGN KEY \("target_revision_id"\)\s+REFERENCES "product_domain"\."setup_definition_revision"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("target_setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("previous_revision_id"\)\s+REFERENCES "product_domain"\."setup_definition_revision"/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("previous_setup_definition_id"\)\s+REFERENCES "product_domain"\."setup_definition"/
  );
  assert.match(
    migration,
    /"previous_setup_definition_id" IS NULL OR\s+"previous_setup_definition_id" <> "target_setup_definition_id"/
  );
  assert.match(
    migration,
    /"previous_revision_id" IS NULL OR "previous_revision_id" <> "target_revision_id"/
  );
  assert.match(
    migration,
    /"created_at_utc" <= "activated_at_utc" AND\s+"updated_at_utc" >= "activated_at_utc"/
  );
});
