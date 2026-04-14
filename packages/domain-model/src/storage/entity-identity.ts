import type { EntityId } from "../common.js";
import type {
  ProductPersistedEntityType,
  RuntimeEvidenceArtifactType,
  StorageBoundary
} from "./storage-boundary.js";

export type EntityIdentity = {
  boundary: StorageBoundary;
  entityType: string;
  entityId: EntityId;
  version: number | null;
  parentEntityId?: EntityId | null;
  relatedEntityIds: EntityId[];
};

export type ProductEntityIdentity = EntityIdentity & {
  boundary: "product_domain";
  entityType: ProductPersistedEntityType;
  version: number;
};

export type RuntimeEvidenceIdentity = EntityIdentity & {
  boundary: "runtime_evidence";
  entityType: RuntimeEvidenceArtifactType;
};
