import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { readReviewPacketFile } from "../src/review-packet-file.js";

test("loads a consistent packet result and rejects altered status", async () => {
  const directory = await mkdtemp(join(tmpdir(), "monitor-review-packet-"));
  const path = join(directory, "packet.json");
  const result = {
    status: "insufficient_context",
    packet: {
      id: "review-packet:family-001:revision-001:2026-09-30T10:00:00.000Z",
      setupFamilyId: "family-001",
      setupRevisionId: "revision-001",
      createdAt: "2026-09-30T10:00:00.000Z",
      status: "insufficient_context",
      includedArtifactRefs: {},
      warnings: [],
    },
  };

  try {
    await writeFile(path, JSON.stringify(result));
    assert.equal((await readReviewPacketFile(path)).id, result.packet.id);

    await writeFile(path, JSON.stringify({ ...result, status: "complete" }));
    await assert.rejects(() => readReviewPacketFile(path), /status is inconsistent/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
