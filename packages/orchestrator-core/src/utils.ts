import { createHash } from "node:crypto";

export function createChecksum(value: unknown): string {
  const normalized = stableStringify(value);
  return createHash("sha256").update(normalized).digest("hex");
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortObject(value));
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObject(item));
  }

  if (value !== null && typeof value === "object") {
    const typed = value as Record<string, unknown>;
    return Object.keys(typed)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortObject(typed[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
