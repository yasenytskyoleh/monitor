import { join, posix } from "node:path";

import { CONFIG_PATHS, SUPPORTED_ENVIRONMENTS } from "./constants.js";
import { compileRuntimeConfig } from "./compiler.js";
import { ReleaseOperationError } from "./errors.js";
import { fileExists, readYamlFile, writeJsonFile, writeYamlFile } from "./io.js";
import { getSchemaValidator } from "./schema-validator.js";
import type {
  ActivateReleaseOptions,
  CompileSnapshotOptions,
  CompileSnapshotResult,
  ConfigVersionRecord,
  PublishReleaseOptions,
  RollbackReleaseOptions,
  RuntimeConfigSnapshot,
  ValidateReleaseOptions,
  VersionManifest
} from "./types.js";

const SCHEMA_IDS = {
  record: "https://monitor/schemas/config-version-record.schema.json",
  manifest: "https://monitor/schemas/version-manifest.schema.json"
} as const;

export class ConfigReleaseManager {
  public constructor(private readonly rootDir: string) {}

  public async validate(options: ValidateReleaseOptions): Promise<RuntimeConfigSnapshot> {
    return compileRuntimeConfig({
      rootDir: this.rootDir,
      environment: options.environment,
      version: options.version,
      envVars: options.envVars
    });
  }

  public async publish(options: PublishReleaseOptions): Promise<ConfigVersionRecord> {
    if (!options.version.trim()) {
      throw new ReleaseOperationError("Version cannot be empty");
    }

    if (!options.createdBy.trim()) {
      throw new ReleaseOperationError("createdBy cannot be empty");
    }

    const validator = getSchemaValidator();
    const manifest = await this.loadManifest();
    const selectedEnvironments = resolvePublishEnvironments(options.environments, manifest);

    const createdRecords: ConfigVersionRecord[] = [];

    for (const environment of selectedEnvironments) {
      if (
        manifest.records.some(
          (record) => record.environment === environment && record.configVersion === options.version
        )
      ) {
        throw new ReleaseOperationError(
          `Version '${options.version}' already published for environment '${environment}'`
        );
      }

      const snapshot = await compileRuntimeConfig({
        rootDir: this.rootDir,
        environment,
        version: options.version,
        envVars: options.envVars
      });

      const relativeSnapshotPath = posix.join(CONFIG_PATHS.snapshotsDir, options.version, `${environment}.json`);
      const absoluteSnapshotPath = join(this.rootDir, relativeSnapshotPath);

      if (await fileExists(absoluteSnapshotPath)) {
        throw new ReleaseOperationError(`Snapshot already exists (immutable): ${relativeSnapshotPath}`);
      }

      await writeJsonFile(absoluteSnapshotPath, snapshot);

      const record: ConfigVersionRecord = {
        releaseId: `${options.version}-${environment}-${Date.now()}`,
        environment,
        configVersion: options.version,
        promptSetVersion: manifest.active.promptSetVersion,
        schemaVersion: manifest.schemaVersion,
        createdBy: options.createdBy,
        createdAt: new Date().toISOString(),
        checksum: snapshot.checksum,
        snapshotPath: relativeSnapshotPath,
        notes: `Published ${options.version} for ${environment}`
      };

      await validator.validateOrThrow(SCHEMA_IDS.record, record, "config version record");

      manifest.records.push(record);
      createdRecords.push(record);
    }

    await validator.validateOrThrow(SCHEMA_IDS.manifest, manifest, "version manifest");
    await this.saveManifest(manifest);

    const firstRecord = createdRecords[0];

    if (!firstRecord) {
      throw new ReleaseOperationError("Publish created no records");
    }

    return firstRecord;
  }

  public async compileSnapshot(options: CompileSnapshotOptions): Promise<CompileSnapshotResult> {
    const manifest = await this.loadManifest();
    const selectedVersion = options.version ?? manifest.active.configVersion;

    if (!selectedVersion.trim()) {
      throw new ReleaseOperationError("Snapshot version cannot be empty");
    }

    const snapshot = await compileRuntimeConfig({
      rootDir: this.rootDir,
      environment: options.environment,
      version: selectedVersion,
      envVars: options.envVars
    });

    const relativeSnapshotPath =
      options.outputPath ?? posix.join(CONFIG_PATHS.snapshotsDir, `${options.environment}.${selectedVersion}.json`);
    const absoluteSnapshotPath = join(this.rootDir, relativeSnapshotPath);

    if ((await fileExists(absoluteSnapshotPath)) && !options.overwrite) {
      throw new ReleaseOperationError(`Snapshot already exists: ${relativeSnapshotPath}`);
    }

    await writeJsonFile(absoluteSnapshotPath, snapshot);

    return {
      environment: options.environment,
      version: selectedVersion,
      checksum: snapshot.checksum,
      snapshotPath: relativeSnapshotPath
    };
  }

  public async activate(options: ActivateReleaseOptions): Promise<VersionManifest> {
    if (!options.activatedBy.trim()) {
      throw new ReleaseOperationError("activatedBy cannot be empty");
    }

    const validator = getSchemaValidator();
    const manifest = await this.loadManifest();

    const targetRecord = manifest.records.find(
      (record) => record.environment === options.environment && record.configVersion === options.version
    );

    if (!targetRecord) {
      throw new ReleaseOperationError(
        `Cannot activate unknown version '${options.version}' for environment '${options.environment}'`
      );
    }

    manifest.active.configVersion = options.version;

    if (!manifest.history) {
      manifest.history = [];
    }

    manifest.history.push({
      environment: options.environment,
      configVersion: options.version,
      activatedAt: new Date().toISOString(),
      activatedBy: options.activatedBy
    });

    await validator.validateOrThrow(SCHEMA_IDS.manifest, manifest, "version manifest");
    await this.saveManifest(manifest);

    return manifest;
  }

  public async rollback(options: RollbackReleaseOptions): Promise<VersionManifest> {
    const manifest = await this.loadManifest();
    const currentVersion = manifest.active.configVersion;

    let previousVersion: string | null = null;

    const historyForEnvironment = (manifest.history ?? []).filter(
      (entry) => entry.environment === options.environment
    );

    for (let index = historyForEnvironment.length - 1; index >= 0; index -= 1) {
      const candidateVersion = historyForEnvironment[index]?.configVersion;
      if (candidateVersion && candidateVersion !== currentVersion) {
        previousVersion = candidateVersion;
        break;
      }
    }

    if (!previousVersion) {
      const historicalRecord = [...manifest.records]
        .reverse()
        .find(
          (record) => record.environment === options.environment && record.configVersion !== currentVersion
        );

      previousVersion = historicalRecord?.configVersion ?? null;
    }

    if (!previousVersion) {
      throw new ReleaseOperationError(`No previous version available for rollback in ${options.environment}`);
    }

    return this.activate({
      environment: options.environment,
      version: previousVersion,
      activatedBy: options.activatedBy
    });
  }

  private async loadManifest(): Promise<VersionManifest> {
    const manifestPath = join(this.rootDir, CONFIG_PATHS.manifest);

    if (!(await fileExists(manifestPath))) {
      throw new ReleaseOperationError(`Missing version manifest: ${manifestPath}`);
    }

    const validator = getSchemaValidator();
    const manifest = await readYamlFile<VersionManifest>(manifestPath);
    await validator.validateOrThrow(SCHEMA_IDS.manifest, manifest, "version manifest");

    return manifest;
  }

  private async saveManifest(manifest: VersionManifest): Promise<void> {
    const manifestPath = join(this.rootDir, CONFIG_PATHS.manifest);
    await writeYamlFile(manifestPath, manifest);
  }
}

function resolvePublishEnvironments(environments: string[] | undefined, manifest: VersionManifest): string[] {
  if (environments && environments.length > 0) {
    return [...new Set(environments)];
  }

  const knownEnvironments = new Set<string>([
    ...SUPPORTED_ENVIRONMENTS,
    ...manifest.records.map((record) => record.environment)
  ]);

  return [...knownEnvironments];
}
