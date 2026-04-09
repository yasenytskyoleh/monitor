import { isAbsolute, join, parse as parsePath, resolve } from "node:path";

import type { CliArgs, MockScenario } from "./types.js";

export function resolveLogPath(rootDir: string, args: CliArgs, snapshotVersion: string): string {
  if (args.logPath) {
    return isAbsolute(args.logPath) ? args.logPath : join(rootDir, args.logPath);
  }

  return join(
    rootDir,
    "runtime",
    "logs",
    `transition-${args.environment}-${snapshotVersion}-${args.taskId}.jsonl`
  );
}

export function resolveScenarioLogPath(
  rootDir: string,
  args: CliArgs,
  snapshotVersion: string,
  scenario: MockScenario
): string {
  const basePath = resolveLogPath(rootDir, args, snapshotVersion);
  return appendPathSuffix(basePath, scenario);
}

export function toRelativeOrAbsolute(rootDir: string, pathValue: string): string {
  const normalizedRoot = resolve(rootDir);
  const normalizedPath = resolve(pathValue);
  if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return normalizedPath.slice(normalizedRoot.length + 1);
  }
  return normalizedPath;
}

function appendPathSuffix(pathValue: string, suffix: string): string {
  const parsed = parsePath(pathValue);
  if (parsed.ext.length > 0) {
    return join(parsed.dir, `${parsed.name}-${suffix}${parsed.ext}`);
  }

  return join(parsed.dir, `${parsed.base}-${suffix}.jsonl`);
}
