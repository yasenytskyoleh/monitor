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
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        const typedValue = value as Record<string, unknown>;
        accumulator[key] = sortObject(typedValue[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  const objectValue = value as Record<string, unknown>;

  Object.values(objectValue).forEach((child) => {
    deepFreeze(child);
  });

  return Object.freeze(value);
}

export function transitionKey(from: string, to: string): string {
  return `${from}=>${to}`;
}

export function parseInteger(value: string, field: string): number {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Expected integer value for ${field}, received: ${value}`);
  }

  return parsedValue;
}

export function parseFloatNumber(value: string, field: string): number {
  const parsedValue = Number.parseFloat(value);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Expected numeric value for ${field}, received: ${value}`);
  }

  return parsedValue;
}
