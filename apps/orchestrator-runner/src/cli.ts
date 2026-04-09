import { SUPPORTED_ENVIRONMENTS } from "@monitor/agent-config";
import type { EnvironmentName } from "@monitor/agent-config";

import { parseAgentModeOverrides } from "./handlers/agent-modes.js";
import type { CliArgs } from "./types.js";

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    mode: "live",
    output: "text",
    agentModeOverrides: {},
    environment: "local",
    taskId: `task-${Date.now()}`,
    requestedBy: "orchestrator-runner",
    taskTitle: "Orchestration run"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const rawArg = argv[index];
    const arg = rawArg?.trim();

    if (!arg || arg === "--") {
      continue;
    }

    if (
      (arg === "run" || arg === "start") &&
      (index === 0 || (index > 0 && argv[index - 1] === "--"))
    ) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    }

    if (arg === "--root") {
      args.rootDir = requiredValue(argv, ++index, "--root");
      continue;
    }

    if (arg === "--mode") {
      const mode = requiredValue(argv, ++index, "--mode");
      if (mode !== "live" && mode !== "mock") {
        throw new Error(`Invalid --mode '${mode}'. Allowed: live, mock`);
      }
      args.mode = mode;
      continue;
    }

    if (arg === "--output") {
      const output = requiredValue(argv, ++index, "--output");
      if (output !== "text" && output !== "json") {
        throw new Error(`Invalid --output '${output}'. Allowed: text, json`);
      }
      args.output = output;
      continue;
    }

    if (arg === "--scenario") {
      const scenario = requiredValue(argv, ++index, "--scenario");
      if (scenario !== "happy" && scenario !== "missing-approval" && scenario !== "both") {
        throw new Error(`Invalid --scenario '${scenario}'. Allowed: happy, missing-approval, both`);
      }
      args.scenario = scenario;
      continue;
    }

    if (arg === "--agent-mode") {
      const raw = requiredValue(argv, ++index, "--agent-mode");
      args.agentModeOverrides = parseAgentModeOverrides(raw);
      continue;
    }

    if (arg === "--env") {
      const environmentValue = requiredValue(argv, ++index, "--env");
      if (!SUPPORTED_ENVIRONMENTS.includes(environmentValue as EnvironmentName)) {
        throw new Error(
          `Invalid --env '${environmentValue}'. Allowed: ${SUPPORTED_ENVIRONMENTS.join(", ")}`
        );
      }
      args.environment = environmentValue as EnvironmentName;
      continue;
    }

    if (arg === "--version") {
      args.version = requiredValue(argv, ++index, "--version");
      continue;
    }

    if (arg === "--task-id") {
      args.taskId = requiredValue(argv, ++index, "--task-id");
      continue;
    }

    if (arg === "--requested-by") {
      args.requestedBy = requiredValue(argv, ++index, "--requested-by");
      continue;
    }

    if (arg === "--task-title") {
      args.taskTitle = requiredValue(argv, ++index, "--task-title");
      continue;
    }

    if (arg === "--input-file") {
      args.inputFile = requiredValue(argv, ++index, "--input-file");
      continue;
    }

    if (arg === "--input-json") {
      args.inputJson = requiredValue(argv, ++index, "--input-json");
      continue;
    }

    if (arg === "--log-path") {
      args.logPath = requiredValue(argv, ++index, "--log-path");
      continue;
    }

    if (arg === "--approval-id") {
      args.approvalId = requiredValue(argv, ++index, "--approval-id");
      continue;
    }

    if (arg === "--approval-by") {
      args.approvalBy = requiredValue(argv, ++index, "--approval-by");
      continue;
    }

    if (arg === "--approval-at-utc") {
      args.approvalAtUtc = requiredValue(argv, ++index, "--approval-at-utc");
      continue;
    }

    if (arg === "--approval-expires-at-utc") {
      args.approvalExpiresAtUtc = requiredValue(argv, ++index, "--approval-expires-at-utc");
      continue;
    }

    if (arg === "--model" || arg === "--temperature" || arg === "--timeout-ms") {
      const value = requiredValue(argv, ++index, arg);
      if (arg === "--model") {
        args.model = value;
      } else if (arg === "--temperature") {
        const parsed = Number.parseFloat(value);
        if (Number.isNaN(parsed)) {
          throw new Error(`Invalid numeric value for --temperature: ${value}`);
        }
        args.temperature = parsed;
      } else {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed)) {
          throw new Error(`Invalid integer value for --timeout-ms: ${value}`);
        }
        args.timeoutMs = parsed;
      }
      continue;
    }

    throw new Error(`Unknown argument: ${rawArg}`);
  }

  if (args.inputFile && args.inputJson) {
    throw new Error("Use either --input-file or --input-json, not both");
  }

  if (args.mode === "mock" && !args.scenario) {
    args.scenario = "both";
  }

  return args;
}

function requiredValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function printHelpAndExit(exitCode: number): never {
  const help = [
    "Usage: pnpm runner run [options]",
    "",
    "Options:",
    "  --root <path>           Repository root (auto-detected if omitted)",
    "  --mode <live|mock>      Runner mode (default: live)",
    "  --output <text|json>    CLI output format (default: text)",
    "  --agent-mode <spec>     Per-agent overrides, e.g. product=live,architect=mock",
    "  --scenario <happy|missing-approval|both> Mock mode scenario selector (default: both)",
    "  --env <local|dev|staging|prod>   Environment (default: local)",
    "  --version <id>          Config version for snapshot (default: active from manifest)",
    "  --task-id <id>          Task id (default: task-<timestamp>)",
    "  --requested-by <name>   Requested by (default: orchestrator-runner)",
    "  --task-title <text>     Default task title when no input JSON/file is provided",
    "  --input-file <path>     JSON object file for task input",
    "  --input-json <json>     Inline JSON object for task input",
    "  --log-path <path>       Transition JSONL output path",
    "  --approval-id <id>      Approval id used for DESIGN -> FORMALIZE",
    "  --approval-by <name>    Approval actor used for DESIGN -> FORMALIZE",
    "  --approval-at-utc <ts>  Approval UTC timestamp (ISO 8601) used for DESIGN -> FORMALIZE",
    "  --approval-expires-at-utc <ts> Approval expiry UTC timestamp (ISO 8601)",
    "  --model <id>            OpenAI model override for live Product Agent",
    "  --temperature <n>       OpenAI temperature override for live Product Agent",
    "  --timeout-ms <n>        OpenAI timeout override (ms) for live Product Agent",
    "  --help                  Show this help",
    "",
    "Notes:",
    "  live mode defaults product-agent and architect-agent to live; others to mock.",
    "  use --agent-mode for per-agent overrides."
  ].join("\n");

  process.stdout.write(`${help}\n`);
  process.exit(exitCode);
}
