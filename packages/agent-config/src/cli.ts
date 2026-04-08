#!/usr/bin/env node
import process from "node:process";

import { compileRuntimeConfig } from "./compiler.js";
import { ConfigReleaseManager } from "./release-manager.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    throw new Error("Missing command. Use: validate | snapshot | publish | activate | rollback");
  }

  const rootDir = getOptionalArg(args, "--root") ?? process.cwd();
  const manager = new ConfigReleaseManager(rootDir);

  if (command === "validate") {
    const environment = getRequiredArg(args, "--env");
    const version = getOptionalArg(args, "--version");
    const snapshot = await compileRuntimeConfig({ rootDir, environment, version });
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
    return;
  }

  if (command === "publish") {
    const version = getRequiredArg(args, "--version");
    const createdBy = getRequiredArg(args, "--by");
    const envValues = getOptionalArg(args, "--envs");
    const environments = envValues?.split(",").map((value) => value.trim()).filter(Boolean);
    const record = await manager.publish({ version, createdBy, environments });
    process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
    return;
  }

  if (command === "snapshot") {
    const environment = getRequiredArg(args, "--env");
    const version = getOptionalArg(args, "--version");
    const outputPath = getOptionalArg(args, "--out");
    const overwrite = hasFlag(args, "--overwrite");
    const result = await manager.compileSnapshot({
      environment,
      version,
      outputPath,
      overwrite
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "activate") {
    const environment = getRequiredArg(args, "--env");
    const version = getRequiredArg(args, "--version");
    const activatedBy = getRequiredArg(args, "--by");
    const manifest = await manager.activate({ environment, version, activatedBy });
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }

  if (command === "rollback") {
    const environment = getRequiredArg(args, "--env");
    const activatedBy = getRequiredArg(args, "--by");
    const manifest = await manager.rollback({ environment, activatedBy });
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function getOptionalArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);

  if (index < 0) {
    return undefined;
  }

  return args[index + 1];
}

function getRequiredArg(args: string[], name: string): string {
  const value = getOptionalArg(args, name);

  if (!value) {
    throw new Error(`Missing required argument: ${name}`);
  }

  return value;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
