import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import YAML from "yaml";

export async function fileExists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}

export async function readYamlFile<T>(pathValue: string): Promise<T> {
  const fileContent = await readFile(pathValue, "utf8");
  const parsed = YAML.parse(fileContent) as T | undefined;

  if (parsed === undefined || parsed === null) {
    throw new Error(`YAML file is empty or invalid: ${pathValue}`);
  }

  return parsed;
}

export async function writeYamlFile(pathValue: string, value: unknown): Promise<void> {
  await mkdir(dirname(pathValue), { recursive: true });
  const yaml = YAML.stringify(value, {
    prettyErrors: true,
    lineWidth: 120,
    defaultStringType: "PLAIN"
  });
  await writeFile(pathValue, yaml, "utf8");
}

export async function writeJsonFile(pathValue: string, value: unknown): Promise<void> {
  await mkdir(dirname(pathValue), { recursive: true });
  await writeFile(pathValue, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readTextFile(pathValue: string): Promise<string> {
  return readFile(pathValue, "utf8");
}
