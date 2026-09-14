CREATE SCHEMA IF NOT EXISTS "runtime_control";

CREATE TYPE "runtime_control"."scheduled_job_name" AS ENUM (
  'btc_evaluate',
  'btc_notify'
);

CREATE TYPE "runtime_control"."scheduled_job_run_status" AS ENUM (
  'running',
  'completed',
  'failed',
  'abandoned'
);

CREATE TABLE "runtime_control"."scheduled_job_run" (
  "run_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "job_name" "runtime_control"."scheduled_job_name" NOT NULL,
  "scope_key" TEXT NOT NULL,
  "owner_id" UUID NOT NULL,
  "status" "runtime_control"."scheduled_job_run_status" NOT NULL,
  "started_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "heartbeat_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "lease_expires_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "completed_at_utc" TIMESTAMPTZ(3),
  "outcome_code" TEXT,
  "summary" JSONB,
  "created_at_utc" TIMESTAMPTZ(3) NOT NULL,
  "updated_at_utc" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "scheduled_job_run_pkey" PRIMARY KEY ("run_id"),
  CONSTRAINT "scheduled_job_run_scope_key_nonempty" CHECK (length(trim("scope_key")) > 0),
  CONSTRAINT "scheduled_job_run_outcome_code_format" CHECK (
    "outcome_code" IS NULL OR "outcome_code" ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
  ),
  CONSTRAINT "scheduled_job_run_lifecycle" CHECK (
    ("status" = 'running' AND "completed_at_utc" IS NULL AND "outcome_code" IS NULL)
    OR
    ("status" <> 'running' AND "completed_at_utc" IS NOT NULL AND "outcome_code" IS NOT NULL)
  ),
  CONSTRAINT "scheduled_job_run_lease_after_heartbeat" CHECK (
    "lease_expires_at_utc" > "heartbeat_at_utc"
  )
);

CREATE INDEX "idx_scheduled_job_run_job_scope_started_at"
  ON "runtime_control"."scheduled_job_run" ("job_name", "scope_key", "started_at_utc");

CREATE INDEX "idx_scheduled_job_run_status_lease_expires_at"
  ON "runtime_control"."scheduled_job_run" ("status", "lease_expires_at_utc");

CREATE UNIQUE INDEX "uq_scheduled_job_run_active_job_scope"
  ON "runtime_control"."scheduled_job_run" ("job_name", "scope_key")
  WHERE "status" = 'running';
