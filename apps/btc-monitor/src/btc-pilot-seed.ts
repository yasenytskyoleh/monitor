import {
  createMonitoringCatalogService,
  createSetupDefinitionService,
  type ImplementedProductRelationalRepositories,
  type MonitoredSymbol,
  type ProductRecordMetadata,
  type SetupDefinition,
  type SetupDefinitionRevision
} from "@monitor/domain-model";

const DEFAULT_SETUP_DEFINITION_ID = "setup-btc-breakout";
const DEFAULT_MONITORED_SYMBOL_ID = "BTC-USDT";

type BtcPilotSeedRepositories = Pick<
  ImplementedProductRelationalRepositories,
  | "monitoredSymbolRepository"
  | "setupDefinitionRepository"
  | "setupDefinitionRevisionRepository"
  | "setupRevisionActivationRecordRepository"
>;

export type BtcPilotSeedOptions = {
  monitoredSymbolId?: string;
  now?: Date;
  repositories: BtcPilotSeedRepositories;
  setupDefinitionId?: string;
};

export type BtcPilotSeedResult = {
  activation: "created" | "existing";
  monitoredSymbol: "created" | "existing";
  revision: "created" | "existing";
  setupDefinition: "created" | "existing";
};

export class BtcPilotSeedConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BtcPilotSeedConflictError";
  }
}

const metadataFor = (nowUtc: string): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "manual_curation",
  lastUpdatedBySource: "manual_curation",
  traceId: "btc-local-pilot-seed",
  sourceObservedAtUtc: nowUtc,
  notes: "canonical local BTC pilot seed"
});

const buildDefinition = (id: string, nowUtc: string): SetupDefinition => ({
  id,
  name: "BTC five-minute breakout",
  description: "Bullish close above the previous twenty closed five-minute candle highs.",
  status: "draft",
  measurableConditions: ["5m close is above every high in the previous 20 closed 5m candles"],
  evaluationAssumptions: ["Evaluate price follow-through over the next 24 hours"],
  invalidationAssumptions: ["No automatic invalidation or order execution"],
  createdAt: nowUtc,
  updatedAt: nowUtc
});

const revisionIdentity = (setupDefinitionId: string): { familyId: string; revisionId: string } =>
  setupDefinitionId === DEFAULT_SETUP_DEFINITION_ID
    ? { familyId: "family-btc-breakout", revisionId: "revision-btc-breakout-1" }
    : {
        familyId: `${setupDefinitionId}-family`,
        revisionId: `${setupDefinitionId}-revision-1`
      };

const buildRevision = (
  setupDefinitionId: string,
  nowUtc: string
): SetupDefinitionRevision => {
  const { familyId, revisionId } = revisionIdentity(setupDefinitionId);
  return {
    id: revisionId,
    setupDefinitionId,
    versionInfo: { setupFamilyId: familyId, revisionId, version: 1 },
    revisionReason: "Initial canonical local BTC breakout pilot",
    revisionStatus: "accepted",
    changedFieldsSummary: "Initial five-minute breakout definition",
    createdBy: "btc-local-pilot-seed",
    createdAt: nowUtc,
    updatedAt: nowUtc
  };
};

const buildSymbol = (symbolId: string, nowUtc: string): MonitoredSymbol => ({
  symbolId,
  baseAsset: "BTC",
  quoteAsset: "USDT",
  displayName: "BTC/USDT",
  marketScope: "spot",
  status: "active",
  providerHint: "unknown",
  tags: ["btc", "spot", "local-pilot"],
  sourceBindings: [{
    sourceId: "binance-spot-mainnet",
    providerSymbol: "BTCUSDT",
    canonicalSymbol: symbolId,
    isPrimary: true
  }],
  createdAtUtc: nowUtc,
  updatedAtUtc: nowUtc
});

const comparableDefinition = (definition: SetupDefinition): unknown => ({
  id: definition.id,
  name: definition.name,
  description: definition.description,
  measurableConditions: definition.measurableConditions,
  evaluationAssumptions: definition.evaluationAssumptions,
  invalidationAssumptions: definition.invalidationAssumptions
});

const comparableRevision = (revision: SetupDefinitionRevision): unknown => ({
  id: revision.id,
  setupDefinitionId: revision.setupDefinitionId,
  versionInfo: revision.versionInfo,
  revisionReason: revision.revisionReason,
  revisionStatus: revision.revisionStatus,
  changedFieldsSummary: revision.changedFieldsSummary,
  createdBy: revision.createdBy,
  sourceSetupRefinementRequestId: revision.sourceSetupRefinementRequestId ?? null
});

const comparableSymbol = (symbol: MonitoredSymbol): unknown => ({
  symbolId: symbol.symbolId,
  baseAsset: symbol.baseAsset,
  quoteAsset: symbol.quoteAsset,
  displayName: symbol.displayName,
  marketScope: symbol.marketScope,
  providerHint: symbol.providerHint,
  tags: symbol.tags,
  sourceBindings: symbol.sourceBindings
});

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, canonicalize(nestedValue)])
  );
};

const assertEqual = (actual: unknown, expected: unknown, entity: string): void => {
  if (JSON.stringify(canonicalize(actual)) !== JSON.stringify(canonicalize(expected))) {
    throw new BtcPilotSeedConflictError(`${entity} conflicts with the canonical BTC pilot seed`);
  }
};

export const seedBtcPilot = async (options: BtcPilotSeedOptions): Promise<BtcPilotSeedResult> => {
  const setupDefinitionId = options.setupDefinitionId ?? DEFAULT_SETUP_DEFINITION_ID;
  const monitoredSymbolId = options.monitoredSymbolId ?? DEFAULT_MONITORED_SYMBOL_ID;
  const nowUtc = (options.now ?? new Date()).toISOString();
  const desiredDefinition = buildDefinition(setupDefinitionId, nowUtc);
  const desiredRevision = buildRevision(setupDefinitionId, nowUtc);
  const desiredSymbol = buildSymbol(monitoredSymbolId, nowUtc);
  const { repositories } = options;

  const [definition, revision, revisionByDefinition, symbol, familyRevisions, activations] =
    await Promise.all([
      repositories.setupDefinitionRepository.getById(setupDefinitionId),
      repositories.setupDefinitionRevisionRepository.getById(desiredRevision.id),
      repositories.setupDefinitionRevisionRepository.getBySetupDefinitionId(setupDefinitionId),
      repositories.monitoredSymbolRepository.getById(monitoredSymbolId),
      repositories.setupDefinitionRevisionRepository.listBySetupFamilyId(
        desiredRevision.versionInfo.setupFamilyId
      ),
      repositories.setupRevisionActivationRecordRepository.listBySetupFamilyId(
        desiredRevision.versionInfo.setupFamilyId
      )
    ]);

  if (definition) {
    assertEqual(comparableDefinition(definition), comparableDefinition(desiredDefinition), "setup_definition");
    if (definition.status !== "draft" && definition.status !== "active") {
      throw new BtcPilotSeedConflictError("setup_definition is not eligible for pilot activation");
    }
  }
  if (revision) assertEqual(comparableRevision(revision), comparableRevision(desiredRevision), "setup_definition_revision");
  if (revisionByDefinition && revisionByDefinition.id !== desiredRevision.id) {
    throw new BtcPilotSeedConflictError("setup_definition is linked to a different revision");
  }
  if (symbol) {
    assertEqual(comparableSymbol(symbol), comparableSymbol(desiredSymbol), "monitored_symbol");
    if (symbol.status !== "active") {
      throw new BtcPilotSeedConflictError("monitored_symbol is not active");
    }
  }
  if (familyRevisions.some((familyRevision) => familyRevision.id !== desiredRevision.id)) {
    throw new BtcPilotSeedConflictError("setup family contains a non-pilot revision");
  }
  if (activations.some((activation) => activation.targetRevisionId !== desiredRevision.id)) {
    throw new BtcPilotSeedConflictError("setup family contains a non-pilot activation");
  }
  if (activations.length > 0 && (!definition || !revision)) {
    throw new BtcPilotSeedConflictError("pilot activation points to incomplete setup state");
  }

  const hasActivation = activations.some(
    (activation) => activation.targetRevisionId === desiredRevision.id
  );
  if (hasActivation && definition?.status !== "active") {
    throw new BtcPilotSeedConflictError("pilot activation conflicts with setup_definition status");
  }

  const setupDefinitionService = createSetupDefinitionService({
    setupDefinitionRepository: repositories.setupDefinitionRepository,
    setupDefinitionRevisionRepository: repositories.setupDefinitionRevisionRepository,
    setupRevisionActivationRecordRepository: repositories.setupRevisionActivationRecordRepository
  });
  const monitoringCatalogService = createMonitoringCatalogService({
    monitoredSymbolRepository: repositories.monitoredSymbolRepository
  });

  if (!definition) {
    await setupDefinitionService.createSetupDefinition({
      definition: desiredDefinition,
      metadata: metadataFor(nowUtc)
    });
  }
  if (!revision) {
    await repositories.setupDefinitionRevisionRepository.create({
      revision: desiredRevision,
      metadata: metadataFor(nowUtc)
    });
  }
  if (!symbol) {
    await monitoringCatalogService.registerMonitoredSymbol({
      symbol: desiredSymbol,
      metadata: metadataFor(nowUtc)
    });
  }

  if (!hasActivation) {
    const activated = await setupDefinitionService.activateRevision({
      setupDefinitionId,
      targetRevisionId: desiredRevision.id,
      activatedBy: "btc-local-pilot-seed",
      activatedAt: nowUtc,
      rationale: "Activate the canonical local BTC pilot setup",
      metadata: metadataFor(nowUtc),
      expectedVersion: null
    });
    if (!activated) {
      throw new BtcPilotSeedConflictError("canonical BTC pilot revision could not be activated");
    }
  }

  return {
    setupDefinition: definition ? "existing" : "created",
    revision: revision ? "existing" : "created",
    monitoredSymbol: symbol ? "existing" : "created",
    activation: hasActivation ? "existing" : "created"
  };
};
