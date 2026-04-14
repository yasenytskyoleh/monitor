import type { TimestampUtc } from "../common.js";
import type { ProductEntityIdentity } from "./entity-identity.js";
import type { ProductRecordMetadata } from "./product-record-metadata.js";
import type { ProductPersistedEntityType } from "./storage-boundary.js";

export const PERSISTED_ENTITY_LIFECYCLE_STATUSES = ["active", "archived"] as const;
export type PersistedEntityLifecycleStatus = (typeof PERSISTED_ENTITY_LIFECYCLE_STATUSES)[number];

export type PersistedEntity = {
  identity: ProductEntityIdentity;
  lifecycleStatus: PersistedEntityLifecycleStatus;
  createdAtUtc: TimestampUtc;
  updatedAtUtc: TimestampUtc;
  metadata: ProductRecordMetadata;
};

export type PersistenceTimingSemantics = {
  createdWhen: string;
  updatedWhen: string;
  immutableFields: string[];
  mutableFields: string[];
  canBeArchived: boolean;
};

export type PersistedEntityProfile = {
  entityType: ProductPersistedEntityType;
  firstClassPersisted: true;
  timing: PersistenceTimingSemantics;
};

export const FIRST_CLASS_PERSISTED_ENTITY_PROFILES: PersistedEntityProfile[] = [
  {
    entityType: "monitored_symbol",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when symbol is enrolled into monitoring scope",
      updatedWhen: "updated when symbol metadata/status changes",
      immutableFields: ["identity.entityId"],
      mutableFields: ["lifecycleStatus", "metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "setup_definition",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when setup definition is authored",
      updatedWhen: "updated on setup revisions and status changes",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "signal_candidate",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when detection pipeline emits candidate",
      updatedWhen: "updated as candidate lifecycle evolves",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "evaluation_result",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created after evaluation window closes or becomes invalidated",
      updatedWhen: "updated when evaluation status transitions before finalization",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "research_hypothesis",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when research hypothesis is authored",
      updatedWhen: "updated on status/criteria review cycles",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "setup_aggregate_result",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when aggregation scope is computed",
      updatedWhen: "updated when recomputation revises aggregate within same identity version",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  }
];
