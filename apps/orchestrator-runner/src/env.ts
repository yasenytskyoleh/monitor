import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

export type DotEnvLoadResult = {
  loadedFrom: string[];
};

export async function loadDotEnv(rootDir: string): Promise<DotEnvLoadResult> {
  const candidateEnvPaths = getCandidateEnvPaths(rootDir);
  const loadedFrom: string[] = [];
  const existingKeys = new Set(
    Object.entries(process.env)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key)
  );

  for (const envPath of candidateEnvPaths) {
    if (!(await exists(envPath))) {
      continue;
    }

    const content = await readFile(envPath, "utf8");
    const lines = content.split(/\r?\n/u);
    for (const line of lines) {
      const parsed = parseDotEnvLine(line);
      if (!parsed) {
        continue;
      }

      const [key, value] = parsed;
      if (existingKeys.has(key)) {
        continue;
      }
      process.env[key] = value;
    }

    loadedFrom.push(envPath);
  }

  return { loadedFrom };
}

export function parseDotEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }

  const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
  const separatorIndex = normalized.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = normalized.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
    return null;
  }

  let value = normalized.slice(separatorIndex + 1).trim();
  const hasQuotes =
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (hasQuotes) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/u, "").trim();
  }

  return [key, value];
}

export function requireOpenAiApiKey(loadedFrom: readonly string[]): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (key) {
    return key;
  }

  const sources =
    loadedFrom.length > 0
      ? loadedFrom.map((pathValue) => `'${pathValue}'`).join(", ")
      : "no .env files";

  throw new Error(
    `OPENAI_API_KEY is required. Checked process environment and loaded ${sources}.`
  );
}

function getCandidateEnvPaths(rootDir: string): string[] {
  return [join(rootDir, ".env"), join(rootDir, "apps", "orchestrator-runner", ".env")];
}

async function exists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}
