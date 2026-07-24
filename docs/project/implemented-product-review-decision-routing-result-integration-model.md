# Implemented Product Review Decision Routing Result Integration Model

## Purpose
Capture opt-in real-Postgres integration coverage through `review_decision_routing_result` in the shared implemented-product repository bundle.

## Implemented artifact locations
- `packages/domain-model/test/implemented-product-relational-repositories.integration.test.ts`
- `docs/architecture/adr/ADR-085-implemented-product-review-decision-routing-result-integration-coverage.md`

## What this step proves
- migration setup applies the routing-result table after its source review-decision table
- the shared Prisma bundle persists and reads the routing result in the full product-domain chain
- a missing source review decision is reported as the adapter’s deterministic `invalid_reference` error

## Execution
The integration tests are opt-in. Set `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` to run them against PostgreSQL; they skip when that variable is absent.

## What remains pending
- select the next later downstream durable slice
- routing-service write-path changes
- runtime detection, evaluation, review, and execution engines
