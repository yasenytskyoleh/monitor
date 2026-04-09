#!/usr/bin/env node
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseArgs } from "./cli.js";
import { handleCliError } from "./output.js";
import { runCli, runWithArgv } from "./runner.js";

export { parseArgs, runCli, runWithArgv };
export type { CliArgs, RunnerOutput } from "./types.js";

const isMainModule =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  runCli().catch(handleCliError);
}
