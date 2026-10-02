import { readFile } from "node:fs/promises";

import type { ResearchReviewPacket } from "@monitor/domain-model";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const readReviewPacketFile = async (path: string): Promise<ResearchReviewPacket> => {
  const result: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isRecord(result) || !isRecord(result.packet)) {
    throw new Error("Invalid review packet file: expected a review-packet command result");
  }

  const packet = result.packet;
  const expectedId =
    isNonemptyString(packet.setupFamilyId) && isNonemptyString(packet.createdAt)
      ? `review-packet:${packet.setupFamilyId}:${packet.setupRevisionId ?? "no-revision"}:${packet.createdAt}`
      : null;
  if (
    !["complete", "partial", "insufficient_context"].includes(String(result.status)) ||
    packet.status !== result.status ||
    packet.id !== expectedId ||
    !Number.isFinite(Date.parse(String(packet.createdAt))) ||
    (packet.setupRevisionId !== undefined && !isNonemptyString(packet.setupRevisionId)) ||
    (packet.hypothesisId !== undefined && !isNonemptyString(packet.hypothesisId)) ||
    !isRecord(packet.includedArtifactRefs) ||
    !Array.isArray(packet.warnings) ||
    !packet.warnings.every((warning: unknown) => typeof warning === "string")
  ) {
    throw new Error("Invalid review packet file: packet identity or status is inconsistent");
  }

  return packet as ResearchReviewPacket;
};
