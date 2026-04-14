export type TimestampUtc = string;
export type EntityId = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = {
  [key: string]: JsonValue;
};

export type DomainEntityBase = {
  createdAtUtc: TimestampUtc;
  updatedAtUtc: TimestampUtc;
};
