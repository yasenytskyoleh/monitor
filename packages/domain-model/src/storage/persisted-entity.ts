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
  },
  {
    entityType: "research_feedback_decision",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when hypothesis evidence is reviewed into setup recommendation",
      updatedWhen: "updated when recommendation review status changes",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "research_decision_approval",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when reviewer submits manual approval outcome for feedback decision",
      updatedWhen: "updated only if approval metadata is corrected in controlled review flow",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "research_review_decision",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when reviewer resolves a research review packet outcome",
      updatedWhen: "updated only for controlled audit metadata corrections in review decision flow",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "setup_lifecycle_mutation_record",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when approved setup lifecycle mutation is applied",
      updatedWhen: "updated only for controlled mutation audit corrections",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "setup_refinement_request",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when approved refine_definition action is converted to structured follow-up request",
      updatedWhen: "updated when refinement request workflow status changes in controlled review path",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "setup_definition_revision",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when refinement request is converted into a versioned setup_definition revision",
      updatedWhen: "updated when revision status metadata changes in controlled revision flow",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  },
  {
    entityType: "setup_revision_activation_record",
    firstClassPersisted: true,
    timing: {
      createdWhen: "created when accepted setup revision is explicitly activated as operational current revision",
      updatedWhen: "updated only for controlled activation audit metadata corrections",
      immutableFields: ["identity.entityId"],
      mutableFields: ["metadata", "updatedAtUtc"],
      canBeArchived: true
    }
  }
];
