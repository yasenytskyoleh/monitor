import type { JsonObject } from "../common.js";
import type { FirstDurableRelationalRuntimePrismaClient } from "../repositories/first-durable-relational-prisma-client.js";
import type {
  AcquireScheduledJobRunRequest,
  AcquireScheduledJobRunResult,
  FinishScheduledJobRunRequest,
  RenewScheduledJobRunRequest,
  ScheduledJobRunMutationResult,
  ScheduledJobRunRepository
} from "./scheduled-job-run-repository.js";
import type { ScheduledJobName, ScheduledJobRun, ScheduledJobRunStatus } from "./scheduled-job-run.js";

type ScheduledJobRunRow = {
  run_id: string;
  version: number;
  job_name: ScheduledJobName;
  scope_key: string;
  owner_id: string;
  status: ScheduledJobRunStatus;
  started_at_utc: Date;
  heartbeat_at_utc: Date;
  lease_expires_at_utc: Date;
  completed_at_utc: Date | null;
  outcome_code: string | null;
  summary: JsonObject | null;
  created_at_utc: Date;
  updated_at_utc: Date;
};

const mapRow = (row: ScheduledJobRunRow): ScheduledJobRun => ({
  runId: row.run_id,
  version: row.version,
  jobName: row.job_name,
  scopeKey: row.scope_key,
  ownerId: row.owner_id,
  status: row.status,
  startedAtUtc: row.started_at_utc.toISOString(),
  heartbeatAtUtc: row.heartbeat_at_utc.toISOString(),
  leaseExpiresAtUtc: row.lease_expires_at_utc.toISOString(),
  ...(row.completed_at_utc ? { completedAtUtc: row.completed_at_utc.toISOString() } : {}),
  ...(row.outcome_code ? { outcomeCode: row.outcome_code } : {}),
  ...(row.summary ? { summary: row.summary } : {}),
  createdAtUtc: row.created_at_utc.toISOString(),
  updatedAtUtc: row.updated_at_utc.toISOString()
});

export class PrismaScheduledJobRunRepository implements ScheduledJobRunRepository {
  constructor(private readonly prisma: FirstDurableRelationalRuntimePrismaClient) {}

  async getById(runId: string): Promise<ScheduledJobRun | null> {
    const rows = await this.prisma.$queryRaw<ScheduledJobRunRow[]>`
      SELECT * FROM "runtime_control"."scheduled_job_run"
      WHERE "run_id" = CAST(${runId} AS UUID)
      LIMIT 1
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listByJob(jobName: ScheduledJobName, scopeKey: string): Promise<ScheduledJobRun[]> {
    const rows = await this.prisma.$queryRaw<ScheduledJobRunRow[]>`
      SELECT * FROM "runtime_control"."scheduled_job_run"
      WHERE "job_name" = CAST(${jobName} AS "runtime_control"."scheduled_job_name")
        AND "scope_key" = ${scopeKey}
      ORDER BY "started_at_utc" ASC
    `;
    return rows.map(mapRow);
  }

  async acquire(request: AcquireScheduledJobRunRequest): Promise<AcquireScheduledJobRunResult> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const acquired = await this.acquireOnce(request);
      if (acquired) return { status: "acquired", run: acquired };

      const active = await this.prisma.$queryRaw<Pick<ScheduledJobRunRow, "run_id" | "lease_expires_at_utc">[]>`
        SELECT "run_id", "lease_expires_at_utc"
        FROM "runtime_control"."scheduled_job_run"
        WHERE "job_name" = CAST(${request.jobName} AS "runtime_control"."scheduled_job_name")
          AND "scope_key" = ${request.scopeKey}
          AND "status" = 'running'
          AND "lease_expires_at_utc" > CURRENT_TIMESTAMP
        LIMIT 1
      `;
      if (active[0]) {
        return {
          status: "already_running",
          activeRunId: active[0].run_id,
          leaseExpiresAtUtc: active[0].lease_expires_at_utc.toISOString()
        };
      }
    }
    throw new Error("scheduled job ownership could not be resolved");
  }

  async renew(request: RenewScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult> {
    const rows = await this.prisma.$queryRaw<ScheduledJobRunRow[]>`
      UPDATE "runtime_control"."scheduled_job_run"
      SET "version" = "version" + 1,
          "heartbeat_at_utc" = CURRENT_TIMESTAMP,
          "lease_expires_at_utc" = CURRENT_TIMESTAMP + (${request.leaseDurationMs} * INTERVAL '1 millisecond'),
          "updated_at_utc" = CURRENT_TIMESTAMP
      WHERE "run_id" = CAST(${request.runId} AS UUID)
        AND "owner_id" = CAST(${request.ownerId} AS UUID)
        AND "status" = 'running'
        AND "lease_expires_at_utc" > CURRENT_TIMESTAMP
      RETURNING *
    `;
    return rows[0] ? { status: "updated", run: mapRow(rows[0]) } : { status: "ownership_lost" };
  }

  complete(request: FinishScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult> {
    return this.finish(request, "completed");
  }

  fail(request: FinishScheduledJobRunRequest): Promise<ScheduledJobRunMutationResult> {
    return this.finish(request, "failed");
  }

  private async acquireOnce(request: AcquireScheduledJobRunRequest): Promise<ScheduledJobRun | null> {
    const rows = await this.prisma.$queryRaw<ScheduledJobRunRow[]>`
      WITH abandoned AS (
        UPDATE "runtime_control"."scheduled_job_run"
        SET "version" = "version" + 1,
            "status" = 'abandoned',
            "completed_at_utc" = CURRENT_TIMESTAMP,
            "outcome_code" = 'lease_expired',
            "summary" = '{}'::jsonb,
            "updated_at_utc" = CURRENT_TIMESTAMP
        WHERE "job_name" = CAST(${request.jobName} AS "runtime_control"."scheduled_job_name")
          AND "scope_key" = ${request.scopeKey}
          AND "status" = 'running'
          AND "lease_expires_at_utc" <= CURRENT_TIMESTAMP
        RETURNING "run_id"
      )
      INSERT INTO "runtime_control"."scheduled_job_run" (
        "run_id", "version", "job_name", "scope_key", "owner_id", "status",
        "started_at_utc", "heartbeat_at_utc", "lease_expires_at_utc",
        "created_at_utc", "updated_at_utc"
      ) VALUES (
        CAST(${request.runId} AS UUID),
        1,
        CAST(${request.jobName} AS "runtime_control"."scheduled_job_name"),
        ${request.scopeKey},
        CAST(${request.ownerId} AS UUID),
        'running',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + (${request.leaseDurationMs} * INTERVAL '1 millisecond'),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  }

  private async finish(
    request: FinishScheduledJobRunRequest,
    status: "completed" | "failed"
  ): Promise<ScheduledJobRunMutationResult> {
    const summary = JSON.stringify(request.summary);
    const rows = await this.prisma.$queryRaw<ScheduledJobRunRow[]>`
      UPDATE "runtime_control"."scheduled_job_run"
      SET "version" = "version" + 1,
          "status" = CAST(${status} AS "runtime_control"."scheduled_job_run_status"),
          "completed_at_utc" = CURRENT_TIMESTAMP,
          "outcome_code" = ${request.outcomeCode},
          "summary" = CAST(${summary} AS JSONB),
          "updated_at_utc" = CURRENT_TIMESTAMP
      WHERE "run_id" = CAST(${request.runId} AS UUID)
        AND "owner_id" = CAST(${request.ownerId} AS UUID)
        AND "status" = 'running'
        AND "lease_expires_at_utc" > CURRENT_TIMESTAMP
      RETURNING *
    `;
    return rows[0] ? { status: "updated", run: mapRow(rows[0]) } : { status: "ownership_lost" };
  }
}
