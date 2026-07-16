import type { SetupRefinementRequest } from "../review/setup-refinement-request.js";
import type { SetupRefinementRequestDurableRecord } from "../storage/setup-refinement-request-relational-slice.js";
import type {
  SetupRefinementRequestCreateRequest,
  SetupRefinementRequestRepository
} from "./setup-refinement-request-repository.js";
import type { SetupRefinementRequestRelationalRepositoryAdapter } from "./setup-refinement-request-relational-repository-adapter.js";
import {
  dehydrateSetupRefinementRequestToDurableRecord,
  hydrateSetupRefinementRequestFromDurableRecord
} from "./setup-refinement-request-relational-repository-mappers.js";

const hydrateRequests = (
  records: SetupRefinementRequestDurableRecord[]
): SetupRefinementRequest[] =>
  records.map((record) => hydrateSetupRefinementRequestFromDurableRecord(record));

export class RelationalSetupRefinementRequestRepository
  implements SetupRefinementRequestRepository
{
  constructor(
    private readonly adapter: SetupRefinementRequestRelationalRepositoryAdapter
  ) {}

  async getById(setupRefinementRequestId: string): Promise<SetupRefinementRequest | null> {
    const record = await this.adapter.loadSetupRefinementRequest(setupRefinementRequestId);
    return record ? hydrateSetupRefinementRequestFromDurableRecord(record) : null;
  }

  async listBySetupDefinitionId(
    setupDefinitionId: string
  ): Promise<SetupRefinementRequest[]> {
    const records = await this.adapter.listSetupRefinementRequestsBySetupDefinitionId(
      setupDefinitionId
    );
    return hydrateRequests(records);
  }

  async listByApprovalId(
    researchDecisionApprovalId: string
  ): Promise<SetupRefinementRequest[]> {
    const records =
      await this.adapter.listSetupRefinementRequestsByResearchDecisionApprovalId(
        researchDecisionApprovalId
      );
    return hydrateRequests(records);
  }

  async create(
    request: SetupRefinementRequestCreateRequest
  ): Promise<SetupRefinementRequest> {
    const record = await this.adapter.insertSetupRefinementRequest({
      record: dehydrateSetupRefinementRequestToDurableRecord(
        request.request,
        request.metadata,
        1
      )
    });

    return hydrateSetupRefinementRequestFromDurableRecord(record);
  }
}
