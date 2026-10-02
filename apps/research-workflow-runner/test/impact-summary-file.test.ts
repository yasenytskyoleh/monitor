import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { readImpactSummaryFile } from "../src/impact-summary-file.js";

test("rejects incomplete impact summary results", async () => {
  const directory = await mkdtemp(join(tmpdir(), "monitor-impact-summary-"));
  const path = join(directory, "summary.json");
  try {
    await writeFile(path, JSON.stringify({
      status: "summarized",
      summary: { setupFamilyId: "family-001", targetRevisionId: "revision-001" },
    }));
    await assert.rejects(() => readImpactSummaryFile(path), /Invalid impact summary file/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
