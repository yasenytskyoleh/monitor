import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Ajv } from "ajv";
import type { ErrorObject } from "ajv";

import { ConfigValidationError } from "./errors.js";
import { fileExists } from "./io.js";

const SCHEMA_DIR_CANDIDATES = [
  ["..", "schemas"],
  ["..", "..", "schemas"],
  ["..", "..", "..", "packages", "agent-config", "schemas"]
] as const;

export class SchemaValidator {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: true,
    strictRequired: false,
    allowUnionTypes: true
  });

  private schemasLoaded = false;

  public async validateOrThrow(schemaId: string, data: unknown, context: string): Promise<void> {
    await this.ensureSchemasLoaded();
    const validate = this.ajv.getSchema(schemaId);

    if (!validate) {
      throw new ConfigValidationError(`Schema not found: ${schemaId}`);
    }

    const isValid = validate(data);

    if (!isValid) {
      const details = formatAjvErrors(validate.errors ?? []);
      throw new ConfigValidationError(`Schema validation failed for ${context}`, details);
    }
  }

  private async ensureSchemasLoaded(): Promise<void> {
    if (this.schemasLoaded) {
      return;
    }

    const schemaDir = await resolveSchemaDirectory();
    const files = await readdir(schemaDir);
    const schemaFiles = files.filter((fileName) => fileName.endsWith(".json")).sort();

    for (const fileName of schemaFiles) {
      const schemaPath = join(schemaDir, fileName);
      const rawSchema = await readFile(schemaPath, "utf8");
      const schema = JSON.parse(rawSchema) as object;
      this.ajv.addSchema(schema);
    }

    this.schemasLoaded = true;
  }
}

let sharedValidator: SchemaValidator | null = null;

export function getSchemaValidator(): SchemaValidator {
  if (!sharedValidator) {
    sharedValidator = new SchemaValidator();
  }

  return sharedValidator;
}

async function resolveSchemaDirectory(): Promise<string> {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));

  for (const candidate of SCHEMA_DIR_CANDIDATES) {
    const candidatePath = join(currentDirectory, ...candidate);
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  throw new ConfigValidationError("Unable to resolve schema directory");
}

function formatAjvErrors(errors: ErrorObject[]): string[] {
  if (errors.length === 0) {
    return ["Unknown schema validation error"];
  }

  return errors.map((error) => {
    const location = error.instancePath.length > 0 ? error.instancePath : "/";
    return `${location} ${error.message ?? "validation error"}`;
  });
}
