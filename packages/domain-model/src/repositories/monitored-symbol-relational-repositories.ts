import type { MonitoredSymbolRepository } from "./monitored-symbol-repository.js";
import type { MonitoredSymbolRelationalRepositoryAdapter } from "./monitored-symbol-relational-repository-adapter.js";
import { RelationalMonitoredSymbolRepository } from "./monitored-symbol-relational-repository.impl.js";

export type MonitoredSymbolRelationalRepositories = { monitoredSymbolRepository: MonitoredSymbolRepository };

export const composeMonitoredSymbolRelationalRepositories = (
  adapter: MonitoredSymbolRelationalRepositoryAdapter
): MonitoredSymbolRelationalRepositories => ({ monitoredSymbolRepository: new RelationalMonitoredSymbolRepository(adapter) });
