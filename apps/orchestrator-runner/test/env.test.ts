import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import { loadDotEnv, parseDotEnvLine, requireOpenAiApiKey } from "../src/env.js";

test("parseDotEnvLine parses export, quotes, and inline comments", () => {
  assert.deepEqual(parseDotEnvLine("export OPENAI_API_KEY='sk-test'"), ["OPENAI_API_KEY", "sk-test"]);
  assert.deepEqual(parseDotEnvLine("OPENAI_MODEL=gpt-5.4-mini # preferred"), [
    "OPENAI_MODEL",
    "gpt-5.4-mini"
  ]);
  assert.equal(parseDotEnvLine("# comment"), null);
  assert.equal(parseDotEnvLine(""), null);
});

test("loadDotEnv loads repo .env and allows app .env to override file values", async () => {
  const root = await mkdtemp(join(tmpdir(), "runner-env-"));
  await mkdir(join(root, "apps", "orchestrator-runner"), { recursive: true });

  await writeFile(
    join(root, ".env"),
    ["OPENAI_API_KEY=from-root", "OPENAI_MODEL=gpt-5.4-mini"].join("\n"),
    "utf8"
  );
  await writeFile(
    join(root, "apps", "orchestrator-runner", ".env"),
    ["OPENAI_API_KEY=from-app"].join("\n"),
    "utf8"
  );

  const oldKey = process.env.OPENAI_API_KEY;
  const oldModel = process.env.OPENAI_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;

  try {
    const result = await loadDotEnv(root);
    assert.equal(result.loadedFrom.length, 2);
    assert.equal(process.env.OPENAI_API_KEY, "from-app");
    assert.equal(process.env.OPENAI_MODEL, "gpt-5.4-mini");
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }

    if (oldModel === undefined) {
      delete process.env.OPENAI_MODEL;
    } else {
      process.env.OPENAI_MODEL = oldModel;
    }
  }
});

test("loadDotEnv does not override shell env values", async () => {
  const root = await mkdtemp(join(tmpdir(), "runner-env-"));
  await writeFile(join(root, ".env"), "OPENAI_API_KEY=from-file\n", "utf8");

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "from-shell";

  try {
    await loadDotEnv(root);
    assert.equal(process.env.OPENAI_API_KEY, "from-shell");
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("requireOpenAiApiKey throws with source context", () => {
  const oldKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    assert.throws(
      () => requireOpenAiApiKey(["/repo/.env"]),
      /OPENAI_API_KEY is required/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});
